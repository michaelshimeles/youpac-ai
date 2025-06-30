"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const scrapeContent = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    // Validate API key presence
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error("FIRECRAWL_API_KEY is not configured in Convex dashboard.");
    }

    // Basic URL validation
    try {
      new URL(args.url);
    } catch (_) {
      throw new Error("Invalid URL provided. Please enter a valid URL.");
    }

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: args.url }), // Using only 'url' as per previous V1, can add other params if needed
      });

      if (response.ok) {
        const data = await response.json();
        // Check for successful response and presence of content
        if (data.success && data.data && data.data.content) {
          return {
            content: data.data.content,
            title: data.data.metadata?.title || "Untitled",
          };
        } else {
          // If success is false or data structure is not as expected, but response was ok (e.g. 200 OK but Firecrawl had an issue)
          console.error("Firecrawl returned ok status but scraping was not successful or data is malformed:", data);
          throw new Error(data.error || "Firecrawl failed to return valid content structure.");
        }
      }

      // Handle specific, non-retriable client errors
      if (response.status === 404) {
        throw new Error("Content not found at this URL (404). Please check the URL and try again.");
      }
      if (response.status === 400) { // Bad Request, often due to invalid URL format for the API
        throw new Error("Invalid URL or request format for scraping service (400).");
      }
      if (response.status === 401 || response.status === 403) { // Unauthorized or Forbidden
        throw new Error("Firecrawl API authentication failed. Please check your API key (401/403).");
      }

      // Handle retriable errors (like rate limits 429 or server errors 5xx)
      if (response.status === 429 || response.status >= 500) {
        attempt++;
        if (attempt >= maxRetries) {
          // Log the final error details before throwing a generic message
          const errorBody = await response.text();
          console.error(`Final scraping attempt failed. Status: ${response.status}, Body: ${errorBody}`);
          throw new Error(`Scraping service is temporarily unavailable (Status: ${response.status}). Please try again later.`);
        }
        const delay = 1000 * Math.pow(2, attempt -1); // Exponential backoff (attempt is 1-based for delay calculation)
        console.log(`Scraping attempt ${attempt} failed with status ${response.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // For other unexpected client-side errors (4xx not handled above), fail immediately
        const errorBody = await response.text();
        console.error(`Failed to scrape content with unhandled status: ${response.status}`, errorBody);
        throw new Error(`Failed to scrape content. Status: ${response.status}, Message: ${errorBody}`);
      }
    }

    // This line should ideally not be reached if logic is correct, but serves as a fallback.
    throw new Error("Failed to scrape content after multiple retries.");
  },
});
