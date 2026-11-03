/**
 * ==============================================================================
 * GROQ API CLIENT & CONFIGURATION
 * UrbanTriage Vision & LLM Module
 * ==============================================================================
 * You can put your Groq API key directly in GROQ_API_KEY below,
 * or configure GROQ_API_KEY in your .env.local file.
 */

export const GROQ_API_KEY: string =
  process.env.GROQ_API_KEY ||
  process.env.NEXT_PUBLIC_GROQ_API_KEY ||
  "";

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Recommended Groq Vision models in priority order.
 * If one model is unavailable or rate-limited, the client automatically tries the next.
 */
export const GROQ_VISION_MODELS = [
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
  "qwen/qwen3.8-27b",
];

export interface GroqMessageContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | GroqMessageContentPart[];
}

/**
 * Resolves an image string (data URL, web URL, or raw base64) to a standard data URL
 */
export async function formatImageDataUrl(imageStr: string): Promise<string> {
  if (!imageStr) return "";

  // Already a data URL
  if (imageStr.startsWith("data:")) {
    return imageStr.trim();
  }

  // HTTP or HTTPS external URL
  if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
    try {
      const res = await fetch(imageStr, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${mimeType};base64,${base64}`;
      }
    } catch (e) {
      console.warn("Could not download external image URL for Groq Vision:", e);
    }
    // Return original URL if download fails
    return imageStr;
  }

  // Raw base64 string
  const cleanBase64 = imageStr.replace(/\s/g, "");
  return `data:image/jpeg;base64,${cleanBase64}`;
}

/**
 * Cleans markdown JSON fences if model wraps response in ```json ... ```
 */
export function extractJsonFromText(text: string): any {
  if (!text) throw new Error("Empty response from model");

  try {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*$/gi, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sub = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(sub);
    }

    const firstBracket = text.indexOf("[");
    const lastBracket = text.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const sub = text.substring(firstBracket, lastBracket + 1);
      const parsedArray = JSON.parse(sub);
      return Array.isArray(parsedArray) && parsedArray.length > 0 ? parsedArray[0] : parsedArray;
    }

    throw new Error(`Failed to extract valid JSON from model response: ${text.slice(0, 160)}`);
  }
}

/**
 * Invokes Groq Chat Completions API with fallback across configured models.
 */
export async function callGroqChat(options: {
  messages: GroqMessage[];
  models?: string[];
  temperature?: number;
  max_tokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const apiKey = GROQ_API_KEY;

  if (!apiKey || apiKey === "YOUR_GROQ_API_KEY_HERE") {
    throw new Error(
      "No GROQ_API_KEY configured. Please put your Groq API key in lib/groq.ts or set GROQ_API_KEY in .env.local"
    );
  }

  const models = options.models && options.models.length > 0 ? options.models : GROQ_VISION_MODELS;
  let lastError: any = null;

  for (const model of models) {
    try {
      const payload: any = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.15,
        max_tokens: options.max_tokens ?? 2048,
      };

      if (options.jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Groq API call to ${model} returned ${res.status}:`, errText.slice(0, 200));
        lastError = new Error(`Groq ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("All Groq models failed.");
}

/**
 * High-level Vision prompt runner for Groq.
 * Accepts one or multiple images and returns text/JSON string.
 */
export async function callGroqVision(options: {
  systemPrompt?: string;
  userPrompt: string;
  images: string[];
  models?: string[];
  jsonMode?: boolean;
}): Promise<string> {
  const userContent: GroqMessageContentPart[] = [
    { type: "text", text: options.userPrompt },
  ];

  for (const img of options.images) {
    const dataUrl = await formatImageDataUrl(img);
    if (dataUrl) {
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl },
      });
    }
  }

  const messages: GroqMessage[] = [];

  if (options.systemPrompt) {
    messages.push({
      role: "system",
      content: options.systemPrompt,
    });
  }

  messages.push({
    role: "user",
    content: userContent,
  });

  return callGroqChat({
    messages,
    models: options.models,
    jsonMode: options.jsonMode ?? true,
    temperature: 0.15,
  });
}
