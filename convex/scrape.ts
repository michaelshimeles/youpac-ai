"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const scrapeContent = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    // Validate API key presence to prevent runtime errors
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured in Convex dashboard.");
    }

    // Basic URL validation
    try {
      new URL(args.url);
    } catch (_) {
      throw new Error("Invalid URL provided. Please enter a valid URL.");
    }

    const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: args.url }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Firecrawl API Error:", errorBody);
        throw new Error(`Failed to scrape content. Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Failed to scrape content from Firecrawl.");
    }
    
    // Ensure data.data and nested properties exist, as per spec for return
    // Fallback for title if metadata or title is missing, though spec implies it's there on success
    const title = data.data && data.data.metadata && typeof data.data.metadata.title === 'string'
                  ? data.data.metadata.title
                  : "Untitled";

    if (!data.data || typeof data.data.content !== 'string') {
        console.error("Firecrawl did not return content in the expected format:", data);
        throw new Error("Firecrawl did not return content in the expected format.");
    }
    
    return {
      content: data.data.content,
      title: title,
    };
  },
});
