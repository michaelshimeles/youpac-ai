"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { openai } from "./utils/openai"; // Assuming a shared client from convex/utils/openai.ts
import { systemPrompt } from "./prompts/blog"; // Import the dedicated prompt

export const generate = action({
  args: {
    sourceContent: v.string(),
    // TODO: Add other context arguments as needed from your plan
    // e.g., brandVoice: v.optional(v.any())
    // For V1, we'll stick to sourceContent as per the provided snippet.
  },
  handler: async (ctx, args) => {
    // Validate OpenAI API key presence
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured in Convex dashboard.");
    }

    const userPrompt = systemPrompt.replace("[SOURCE_CONTENT_HERE]", args.sourceContent);

    const response = await openai.chat.completions.create({
        model: "gpt-4o", // As specified in the report
        messages: [{ role: "system", content: userPrompt }], // The prompt now acts as a system message
        response_format: { type: "json_object" }, // Enforce JSON output
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("AI did not return any content. Response:", response);
      throw new Error("AI did not return any content.");
    }

    // Validate the JSON structure
    try {
      const parsed = JSON.parse(content);
      // Ensure all required fields are present, as per the prompt's specified JSON output
      if (
        !parsed.title ||
        !parsed.content ||
        !parsed.metaDescription ||
        !Array.isArray(parsed.keywords) || // Check if keywords is an array
        !Array.isArray(parsed.links) // Check if links is an array
        // We can also add more specific checks for link objects if needed
      ) {
        console.error("AI returned incomplete JSON data. Parsed:", parsed);
        throw new Error("AI returned incomplete JSON data. Missing one or more required fields: title, content, metaDescription, keywords, links.");
      }
      return parsed; // Return the parsed JSON object
    } catch (e: any) {
        console.error("Failed to parse AI JSON response or data validation failed. Content:", content, "Error:", e.message);
        throw new Error(`AI returned invalid data format or incomplete data. Raw content: ${content}`);
    }
  },
});
