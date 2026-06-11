import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

type GenerateOptions = {
  maxOutputTokens?: number;
  temperature?: number;
  model?: string;
};

export async function generateRestaurantText(
  prompt: string,
  fallback: string,
  options: GenerateOptions = {}
) {
  const maxOutputTokens = options.maxOutputTokens ?? 256;
  const temperature = options.temperature ?? 0.45;
  const modelName = options.model ?? 'gemini-1.5-flash';

  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('No GEMINI_API_KEY');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (text) return text;
    throw new Error('Empty Gemini response');
  } catch (geminiErr) {
    console.warn('[LLM] Gemini failed, trying Groq:', (geminiErr as Error).message);

    try {
      if (!process.env.GROQ_API_KEY) throw new Error('No GROQ_API_KEY');

      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxOutputTokens,
        temperature,
      });

      const text = res.choices[0].message.content?.trim();
      if (text) return text;
      throw new Error('Empty Groq response');
    } catch (groqErr) {
      console.error('[LLM] Both providers failed:', groqErr);
      return fallback;
    }
  }
}