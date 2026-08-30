import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  console.time("gemini");
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: 'say hi',
    });
    console.log("Response:", res.text);
  } catch (e) {
    console.error("Error:", e);
  }
  console.timeEnd("gemini");
}
run();
