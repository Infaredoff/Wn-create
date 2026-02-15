import { GoogleGenAI } from "@google/genai";
import { AppMode } from "./types";

export const callGemini = async (
  prompt: string, 
  apiKey: string, 
  mode: AppMode,
  jsonMode: boolean = false
): Promise<string | null> => {
  
  if (mode === 'mock') {
    await new Promise(r => setTimeout(r, 800)); // Simulate latency
    if (jsonMode) {
      return JSON.stringify({ 
        candidates: [{ name: "MockName", fit: "Standard" }],
        names: ["MockName1", "MockName2"] 
      });
    }
    return `[MOCK OUTPUT] generated based on: "${prompt.substring(0, 30)}..."\n\nTo use real AI, switch to API Mode in Settings.`;
  }

  // Live Mode
  // Check process.env for static deployment key if user key is empty
  const effectiveKey = apiKey || (typeof process !== 'undefined' && process.env ? process.env.API_KEY : '');
  
  if (!effectiveKey) {
    throw new Error("No API Key provided");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: effectiveKey });
    const model = ai.models.generateContent({
      model: 'gemini-2.5-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: jsonMode ? "application/json" : "text/plain",
        temperature: 0.8
      }
    });
    
    const result = await model;
    return result.text;
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    throw new Error(e.message || "Unknown API Error");
  }
};