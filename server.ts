import express from 'express';
import ViteExpress from 'vite-express';
import { GoogleGenAI, LiveServerMessage, Modality, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/generate', async (req, res) => {
  try {
    const { query, context, language = "English", mode = "fast" } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    let prompt = "";
    if (language === 'Auto-detect') {
      prompt = `You are a highly capable AI assistant.

CRITICAL RULES:
1. Detect the primary language of the user's query.
2. If the user's query is in English, you MUST respond ENTIRELY in English.
3. If the user's query is in another language (e.g., Hindi, Gujarati, Bengali, etc.), respond ENTIRELY in that exact same language, using its proper NATIVE SCRIPT (e.g., Devanagari for Hindi, Gujarati script for Gujarati).
4. Do NOT respond in Hindi unless the user explicitly asked the question in Hindi.
5. NEVER mix languages in your answer.

Context: ${context.join(' ')}. Query: ${query}

Return a JSON object with three fields:
"translatedQuery": The user's query translated into the detected language's native script.
"answer": Your concise answer (1-2 sentences) in the detected language's native script.
"languageCode": The correct BCP 47 language tag for the detected language (e.g., "en-US", "hi-IN", "gu-IN", "bn-IN", "mr-IN", "ta-IN", "te-IN", etc.).`;
    } else {
      prompt = `You are a highly capable AI assistant.

CRITICAL RULES:
1. You MUST respond ENTIRELY and STRICTLY in the following language: ${language}.
2. If ${language} is English, your answer MUST be entirely in English.
3. If ${language} is a different language (like Hindi, Gujarati, Tamil, etc.), use its proper native script and alphabet. Do NOT use English/Latin letters for it.
4. NEVER respond in any language other than ${language}. Do NOT respond in Hindi if ${language} is English.

Context: ${context.join(' ')}. Query: ${query}

Return a JSON object with three fields:
"translatedQuery": The user's query translated/transliterated into ${language} in its native script.
"answer": The concise answer text strictly in ${language} in its native script.
"languageCode": The correct BCP 47 language tag for ${language} (e.g., "en-US", "hi-IN", "gu-IN", "pa-IN", "or-IN", "ta-IN", "te-IN", "kn-IN", "ml-IN", "bn-IN", "mr-IN", "ur-IN").`;
    }

    let modelId = 'gemini-3.1-flash-lite';
    let config: any = {
      temperature: 0.2,
      responseMimeType: "application/json"
    };

    if (mode === 'thinking') {
      modelId = 'gemini-3.1-pro-preview';
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      // maxOutputTokens is intentionally omitted for high thinking
    } else {
      config.maxOutputTokens = 300;
    }

    const response = await genai.models.generateContent({
      model: modelId,
      contents: prompt,
      config
    });

    if (response.text) {
      let rawText = response.text;
      if (rawText.startsWith('```')) {
        const lines = rawText.split('\n');
        if (lines[0].includes('json')) {
          lines.shift();
        } else if (lines[0].startsWith('```')) {
          lines.shift();
        }
        if (lines[lines.length - 1].startsWith('```')) {
          lines.pop();
        } else if (lines[lines.length - 2]?.startsWith('```')) {
          lines.splice(lines.length - 2, 2);
        }
        rawText = lines.join('\n').trim();
      }
      
      const data = JSON.parse(rawText);
      res.json({ answer: data.answer, languageCode: data.languageCode, translatedQuery: data.translatedQuery });
    } else {
      res.json({ answer: "No response.", languageCode: "en-US", translatedQuery: query });
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate answer' });
    } else {
      res.end();
    }
  }
});

app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body; // base64
    if (!audioData) return res.status(400).json({ error: "No audio data" });
    
    const response = await genai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: "audio/wav",
            data: audioData
          }
        },
        { text: "Transcribe this audio precisely. Return only the transcription." }
      ]
    });
    
    res.json({ transcript: response.text });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Failed to transcribe" });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const { text, languageCode } = req.body;
    if (!text) return res.status(400).json({ error: "No text provided" });

    const response = await genai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: `Speak the following text clearly in the language matching this code (${languageCode}): ${text}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }
        }
      }
    });
    
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
       res.json({ audioBase64: part.inlineData.data, mimeType: part.inlineData.mimeType || 'audio/wav' });
    } else {
       res.status(500).json({ error: "No audio generated" });
    }
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs, req) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const language = url.searchParams.get('language') || 'English';

    const systemInstruction = language === 'Auto-detect'
      ? "You are a helpful and very concise voice assistant. Reply in the same language the user speaks."
      : `You are a helpful and very concise voice assistant. The user wants to converse strictly in ${language}. You MUST speak and respond ONLY in ${language}. Do not use any other language.`;

    const session = await genai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audio && clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === clientWs.OPEN) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
      },
    });

    clientWs.on("message", (data) => {
      try {
        const { audio } = JSON.parse(data.toString());
        if (audio) {
          session.sendRealtimeInput({
            audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (err) {
        console.error("Error processing websocket message", err);
      }
    });
    
    clientWs.on("close", () => {
      // Note: session.close is not natively exposed in the exact same manner usually, but in standard usage we can let the garbage collector or explicitly close if possible.
    });

  } catch (error) {
    console.error("Error starting live session", error);
    clientWs.close();
  }
});

const PORT = parseInt(process.env.PORT || '3000', 10);
ViteExpress.bind(app, server);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
