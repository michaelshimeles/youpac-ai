import { OpenAI } from "openai";

let _openai: OpenAI | null = null;

export const openai = {
  get client() {
    if (!_openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not configured. Please set it in your Convex dashboard or .env.local file.");
      }
      _openai = new OpenAI({ apiKey });
    }
    return _openai;
  },
  
  // Proxy all OpenAI methods to the lazy client
  chat: {
    get completions() {
      return openai.client.chat.completions;
    }
  }
};