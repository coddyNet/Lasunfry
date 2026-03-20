import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export async function correctGrammar(text: string): Promise<string> {
  if (!text.trim()) return text;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Please correct the grammar and spelling of the following text while preserving its meaning and style. Return ONLY the corrected text without any explanations or markdown formatting unless the original had it: \n\n${text}`,
      config: {
        systemInstruction: "You are a professional editor. Your task is to fix grammar, spelling, and punctuation errors in the provided text. Maintain the original tone and intent.",
      },
    });

    return response.text || text;
  } catch (error) {
    console.error("Grammar correction failed:", error);
    return text;
  }
}
