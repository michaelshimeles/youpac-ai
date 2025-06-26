import { action } from "../_generated/server";
import { v } from "convex/values";
import { openai } from "../utils/openai";

export const generateBlogPost = action({
  args: { 
    sourceContent: v.string(),
    type: v.string() // 'topic', 'transcript', or 'scraped'
  },
  handler: async (ctx, args) => {
    const { sourceContent, type } = args;
    
    const systemPrompt = `You are an expert content marketer specializing in SEO-optimized blog posts. Generate a blog post based on the provided source content (topic, video transcript, or scraped web content). The post must:

1. **Title**: Create an engaging, SEO-friendly title (50-60 characters) with a primary keyword.
2. **Structure**: Include an introduction, 3-4 main sections with H2/H3 subheadings, and a conclusion.
3. **Content**: Write 800-1,200 words of actionable insights, examples, or stories derived from the source.
4. **SEO**: Integrate 3-5 relevant keywords naturally, include a meta description (150-160 characters), and suggest 2-3 internal/external links (as URLs with titles).
5. **Tone**: Maintain a professional yet approachable tone suitable for thought leadership.
6. **Call-to-Action**: End with a CTA encouraging engagement (e.g., 'Share your thoughts in the comments!').
7. **Originality**: If the source is scraped content, rewrite and summarize in a unique voice. Do NOT copy sentences or paragraphs directly. Create a new, original piece inspired by the source.

IMPORTANT OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure:
{
  "title": "SEO-friendly title (50-60 characters)",
  "content": "Full blog post content with HTML tags for H2/H3 headings and formatting",
  "metaDescription": "Meta description (150-160 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "links": [
    { "url": "https://example.com", "title": "Link Title 1" },
    { "url": "https://example.com", "title": "Link Title 2" }
  ]
}

Do NOT include any text before or after the JSON object. Ensure the JSON is valid and properly escaped.`;

    const userPrompt = `Source type: ${type}
Source content: ${sourceContent}

Generate an SEO-optimized blog post based on this content.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error("No content generated");
      }
      
      // Parse and validate JSON response
      let blogPost;
      try {
        blogPost = JSON.parse(content);
      } catch (parseError) {
        throw new Error("Invalid JSON response from AI");
      }
      
      // Validate required fields
      if (!blogPost.title || !blogPost.content || !blogPost.metaDescription) {
        throw new Error("Missing required fields in generated blog post");
      }
      
      // Ensure arrays exist
      if (!Array.isArray(blogPost.keywords)) {
        blogPost.keywords = [];
      }
      if (!Array.isArray(blogPost.links)) {
        blogPost.links = [];
      }
      
      return blogPost;
      
    } catch (error) {
      console.error("Blog generation error:", error);
      throw new Error(`Blog generation failed: ${error.message}`);
    }
  },
});

// V2: Integrate keyword suggestion API (e.g., Google Keyword Planner) for dynamic SEO keywords.
// V2: Add content optimization scoring and readability analysis.
// V2: Enable custom tone/style preferences from user profiles.
// V2: Add A/B testing capabilities for different blog variations.