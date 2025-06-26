import { action } from "../_generated/server";
import { v } from "convex/values";

export const scrapeContent = action({
  args: { 
    url: v.string() 
  },
  handler: async (ctx, args) => {
    const { url } = args;
    
    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      throw new Error("Invalid URL format. Please provide a valid URL starting with http:// or https://");
    }
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptScrape = async (): Promise<{ content: string; title: string }> => {
      try {
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url,
            formats: ['markdown'],
            onlyMainContent: true,
            includeTags: ['h1', 'h2', 'h3', 'p', 'li', 'blockquote']
          }),
        });
        
        if (response.status === 429) {
          // Rate limit hit
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Rate limited, retrying (${retryCount}/${maxRetries}) in 1 second...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return attemptScrape();
          } else {
            throw new Error("Rate limit exceeded. Please try again in a moment.");
          }
        }
        
        if (response.status === 404) {
          throw new Error("Page not found. Please check the URL and try again.");
        }
        
        if (response.status === 400) {
          throw new Error("Invalid URL. Please check the URL format and try again.");
        }
        
        if (!response.ok) {
          throw new Error(`Failed to scrape content (${response.status}). Please try again later.`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to scrape content');
        }
        
        // Validate scraped data
        if (!data.data || !data.data.content) {
          throw new Error("No content found on this page. Please try a different URL.");
        }
        
        return {
          content: data.data.content || '', // Markdown content
          title: data.data.metadata?.title || 'Untitled Page', // Page title
        };
        
      } catch (error) {
        if (retryCount < maxRetries && error.message.includes('Rate limit')) {
          retryCount++;
          console.log(`Retrying scrape (${retryCount}/${maxRetries}) in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptScrape();
        }
        throw error;
      }
    };
    
    return attemptScrape();
  },
});