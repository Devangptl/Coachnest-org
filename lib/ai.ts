/**
 * Google Gemini AI integration for the AI Tutor chatbot.
 * Provides context-aware responses scoped to lesson content.
 */
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** Retry wrapper — waits and retries once on 429 rate limit errors. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Check if it's a rate limit error with a retry delay
    if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
      const delayMatch = message.match(/retry\s*(?:in|Delay[":]*)\s*(\d+)/i);
      const waitSecs = delayMatch ? Math.min(parseInt(delayMatch[1]), 60) : 15;
      await new Promise((r) => setTimeout(r, waitSecs * 1000));
      return await fn();
    }
    throw err;
  }
}

const SYSTEM_PROMPT = `You are an AI tutor for an academic learning platform called LearnHub. Your role is to help students understand lesson content.

Guidelines:
- Answer questions clearly and concisely, using simple language appropriate for students.
- When lesson content is provided, base your answers on that specific material.
- If the student asks something outside the lesson scope, briefly answer but guide them back to the lesson topic.
- Use examples and analogies to explain complex concepts.
- Encourage the student when they ask good questions.
- Format responses with markdown for readability (bold, lists, code blocks where appropriate).
- Keep responses focused — aim for 2-4 paragraphs max unless the question needs more detail.
- Never make up facts. If unsure, say so honestly.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message to Gemini with lesson context and conversation history.
 * Returns the assistant's response text.
 */
export async function chatWithTutor(
  lessonTitle: string,
  lessonContent: string | null,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const contextBlock = lessonContent
    ? `\n\nCurrent lesson: "${lessonTitle}"\n\nLesson content:\n${lessonContent.slice(0, 8000)}`
    : `\n\nCurrent lesson: "${lessonTitle}"`;

  const systemPrompt = SYSTEM_PROMPT + contextBlock;

  // Build Gemini conversation history
  const geminiHistory = history.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        ...geminiHistory,
        { role: "user", parts: [{ text: userMessage }] },
      ],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 1024,
      },
    })
  );

  return response.text ?? "I apologize, I could not generate a response.";
}

/**
 * Generate MCQ quiz questions from lesson content using Gemini.
 * Returns structured JSON array of questions.
 */
export async function generateQuizFromLesson(
  lessonTitle: string,
  lessonContent: string,
  questionCount: number = 5
): Promise<GeneratedQuestion[]> {
  const prompt = `Generate exactly ${questionCount} multiple-choice questions based on the following lesson content.

Lesson: "${lessonTitle}"

Content:
${lessonContent.slice(0, 8000)}

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation, no code fences):
[
  {
    "text": "Question text here?",
    "options": [
      { "id": "a", "text": "Option A", "isCorrect": false },
      { "id": "b", "text": "Option B", "isCorrect": true },
      { "id": "c", "text": "Option C", "isCorrect": false },
      { "id": "d", "text": "Option D", "isCorrect": false }
    ]
  }
]

Requirements:
- Each question must have exactly 4 options
- Exactly one option per question must be correct
- Questions should test understanding, not just memorization
- Vary difficulty: include easy, medium, and hard questions`;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
      },
    })
  );

  let text = response.text;
  if (!text) throw new Error("No response from AI");

  // Strip markdown code fences if Gemini wraps the JSON
  text = text.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(text);
  return parsed as GeneratedQuestion[];
}

export interface GeneratedQuestion {
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}
