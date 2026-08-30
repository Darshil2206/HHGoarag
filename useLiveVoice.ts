import { useState, useRef, useCallback } from 'react';

export function useLiveVoice() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async (language: string = 'English') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new window.AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      // Deprecated but simple for inline PCM capturing
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live?language=${encodeURIComponent(language)}`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        disconnect(); // Cleanup
      };
      
      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        setError("WebSocket Error");
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.interrupted) {
            // handle interrupt
          }
          if (data.audio) {
            // Decode base64 to binary string
            const binaryString = atob(data.audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Raw PCM 16-bit 24kHz from Gemini Live API
            const int16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(int16.length);
            for (let i = 0; i < int16.length; i++) {
              float32[i] = int16[i] / 32768.0;
            }
            
            const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
            audioBuffer.getChannelData(0).set(float32);
            
            const bufferSource = audioCtx.createBufferSource();
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(audioCtx.destination);
            bufferSource.start();
          }
        } catch (e) {
          console.error("Audio playback error:", e);
        }
      };

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          
          // Convert array buffer to base64
          const bytes = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      source.connect(processor);
      // We need to connect processor to destination for onaudioprocess to fire in some browsers
      processor.connect(audioCtx.destination);
      
    } catch (err: any) {
      console.error("Failed to connect live voice", err);
      setError(err.message || "Failed to access microphone");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return { isConnected, error, connect, disconnect };
}
