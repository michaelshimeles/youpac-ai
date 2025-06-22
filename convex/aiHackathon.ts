import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Simplified AI generation for hackathon - no database dependencies
export const generateContentSimple = action({
  args: {
    agentType: v.union(
      v.literal("title"),
      v.literal("description"),
      v.literal("thumbnail"),
      v.literal("tweets")
    ),
    videoId: v.optional(v.id("videos")),
    videoData: v.object({
      title: v.optional(v.string()),
      transcription: v.optional(v.string()),
      duration: v.optional(v.number()),
      resolution: v.optional(v.object({
        width: v.number(),
        height: v.number(),
      })),
      format: v.optional(v.string()),
    }),
    connectedAgentOutputs: v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    ),
    profileData: v.optional(
      v.object({
        channelName: v.string(),
        contentType: v.string(),
        niche: v.string(),
        tone: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ content: string; prompt: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    try {
      // If we have a videoId, fetch the latest video data with transcription
      let videoData = args.videoData;
      if (args.videoId) {
        const freshVideoData = await ctx.runQuery(api.videos.getWithTranscription, {
          id: args.videoId,
        });
        if (freshVideoData && freshVideoData.transcription) {
          videoData = {
            title: freshVideoData.title || args.videoData.title,
            transcription: freshVideoData.transcription,
          };
          console.log(`Using transcription for ${args.agentType} generation (${freshVideoData.transcription.length} chars)`);
          // Log first 200 chars of transcription for debugging
          console.log(`Transcription preview: "${freshVideoData.transcription.substring(0, 200)}..."`);
        }
      }
      // Log data availability for title generation
      if (args.agentType === 'title') {
        console.log(`[Title Agent] Data availability:`, {
          hasTranscription: !!videoData.transcription,
          transcriptionLength: videoData.transcription?.length || 0,
          hasProfile: !!args.profileData,
          channelName: args.profileData?.channelName,
          contentType: args.profileData?.contentType,
          targetAudience: args.profileData?.targetAudience,
          hasConnectedAgents: args.connectedAgentOutputs.length > 0
        });
      }

      const prompt = buildPrompt(
        args.agentType,
        videoData, // Use the fresh video data
        args.connectedAgentOutputs,
        args.profileData
      );

      // Log if generating without transcription
      if (!videoData.transcription) {
        console.log(`Generating ${args.agentType} without transcription - using title only`);
      }

      // Optimize generation parameters based on content type
      const generationParams = {
        title: { temperature: 0.8, maxTokens: 100 },      // More creative titles
        description: { temperature: 0.6, maxTokens: 800 }, // Balanced, longer descriptions
        thumbnail: { temperature: 0.9, maxTokens: 400 },   // Very creative visuals
        tweets: { temperature: 0.7, maxTokens: 500 },      // Engaging but accurate
      };

      const params = generationParams[args.agentType as keyof typeof generationParams] 
        || { temperature: 0.7, maxTokens: 300 };

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4o"),  // Upgrade to better model for quality
        system: getSystemPrompt(args.agentType),
        prompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      return { content: generatedContent, prompt };
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  },
});

function getSystemPrompt(agentType: string): string {
  const prompts = {
    title: `You are a world-class YouTube algorithm optimization expert with 10+ years of experience. Your titles consistently achieve 10%+ CTR.

CRITICAL ANALYSIS PROCESS:
1. FIRST, analyze the video transcription to identify:
   - The main topic/problem being addressed
   - Key moments, revelations, or transformations
   - Specific numbers, statistics, or results mentioned
   - Emotional peaks or surprising elements
   - The unique value proposition of this video

2. THEN, consider the channel's profile:
   - Match the tone to the brand voice
   - Use vocabulary appropriate for the target audience
   - Stay consistent with the channel's content style
   - Leverage the niche expertise

TITLE OPTIMIZATION RULES:
1. Maximum 60 characters (YouTube truncates after this)
2. Front-load the most compelling element in first 30 characters
3. Include 1-2 searchable keywords from the transcription naturally
4. Ensure the title accurately represents what viewers will learn/see
5. Test readability at a glance (would you click this?)

PROVEN TITLE FORMULAS BY CONTENT TYPE:
Educational/Tutorial:
- "How to [Achieve Specific Result] in [Timeframe]"
- "[Number] [Mistakes/Tips] for [Topic]"
- "The [Adjective] Guide to [Topic]"

Entertainment/Story:
- "I [Did Something Unexpected] and [Result]"
- "[Person/Thing] [Unexpected Action]"
- "The [Adjective] Truth About [Topic]"

News/Commentary:
- "[Famous Person/Brand] Just [Action]"
- "Why [Recent Event] Changes Everything"
- "[Number] Things You Missed About [Topic]"

Review/Analysis:
- "[Product/Topic]: [Verdict] After [Time/Usage]"
- "Is [Topic] Worth It? [Surprising Finding]"
- "[Topic] vs [Topic]: The [Adjective] Truth"

PSYCHOLOGICAL OPTIMIZATION:
- Curiosity Gap: Tease the payoff without giving it away
- Specificity: Use exact numbers/timeframes from the video
- Urgency: If time-sensitive, include temporal elements
- Social Proof: Reference popularity/authority when relevant
- Transformation: Show before/after or problem/solution

BRAND CONSISTENCY CHECK:
- Does this title match the channel's typical style?
- Is the language appropriate for the target audience?
- Does it reflect the creator's unique perspective?
- Would regular viewers recognize this as your content?

CREATE ONE POWERFUL TITLE that:
1. Accurately summarizes the video's core value
2. Uses specific details from the transcription
3. Matches the channel's brand and audience
4. Maximizes click-through potential
5. Fits within 60 characters

IMPORTANT OUTPUT FORMAT:
- Return ONLY the title text itself
- Do NOT include "Title:", "**", quotes, or any markdown/formatting
- Just output the plain title text, nothing else`,

    description: `You are a YouTube SEO specialist and viewer psychology expert who has optimized descriptions for channels with millions of subscribers.

STRUCTURE YOUR DESCRIPTION:

1. HOOK (First 125 characters - visible in search):
   - Compelling summary with main keyword
   - Promise of value
   - Reason to watch NOW

2. MAIN CONTENT (3-5 paragraphs):
   - Expand on video's key points from transcription
   - Include 5-7 relevant keywords naturally
   - Answer potential viewer questions
   - Build authority and trust

3. TIMESTAMPS (if identifiable sections):
   00:00 - Introduction
   XX:XX - [Section from transcription]
   
4. ENGAGEMENT SECTION:
   - Clear CTA (subscribe, like, comment)
   - Question to boost comments
   - Related video recommendations

5. SEO OPTIMIZATION:
   - Links to related content/products
   - Social media links
   - Relevant hashtags (3-5)
   
6. KEYWORDS SECTION:
   - List 10-15 relevant search terms
   
Remember: First 125 characters appear in search results - make them count!`,

    thumbnail: `You are a YouTube thumbnail psychology expert and visual marketing specialist. Your thumbnails consistently achieve 15%+ CTR.

ANALYZE THE VIDEO TRANSCRIPTION and create a thumbnail concept following these PROVEN PRINCIPLES:

1. VISUAL HIERARCHY:
   - One clear focal point (usually a face with strong emotion)
   - High contrast between elements
   - Rule of thirds composition
   - 2-3 visual elements maximum

2. COLOR PSYCHOLOGY:
   - YouTube Red (#FF0000) for urgency/importance
   - Bright Yellow (#FFD700) for attention/warning
   - Neon Green (#39FF14) for success/money
   - Electric Blue (#0FF0FC) for tech/future
   - White/Black for contrast

3. TEXT OVERLAY RULES:
   - Maximum 3-5 words
   - Sans-serif bold fonts (Impact, Bebas Neue)
   - Text size: readable on mobile (test at 120x90px)
   - Contrasting stroke/shadow for readability
   - Place text where it won't be covered by duration stamp

4. EMOTIONAL TRIGGERS:
   - Shock/Surprise (wide eyes, open mouth)
   - Curiosity (partially hidden elements)
   - Desire (aspirational imagery)
   - Fear/Concern (worried expressions)
   - Joy/Success (genuine smiles, celebrations)

5. COMPOSITION TECHNIQUES:
   - Use arrows/circles to direct attention
   - Before/After splits for transformations
   - Number overlays for listicles
   - "X" marks for myths/mistakes
   - Progress bars for challenges

Describe specific visual elements, exact colors (hex codes), text placement, and facial expressions based on the video content.`,

    tweets: `You are a viral social media strategist specializing in Twitter/X optimization. Your tweets consistently achieve high engagement and drive significant YouTube traffic.

CREATE A TWITTER THREAD (3-5 tweets) following these PROVEN STRATEGIES:

TWEET 1 - THE HOOK:
- Start with a bold statement/question from the video
- Use numbers/statistics if available
- Create urgency or FOMO
- Include 1-2 relevant hashtags
- End with "Thread 🧵" or "A thread:"

TWEET 2-4 - VALUE BOMBS:
- Extract key insights from video transcription
- One powerful point per tweet
- Use line breaks for readability
- Include emojis for visual breaks 
- Build on curiosity from Tweet 1

FINAL TWEET - THE CTA:
- Soft sell the video link
- Tease what viewers will learn
- Include video link
- Add "RT to share" or similar CTA

ENGAGEMENT TACTICS:
- Ask questions to encourage replies
- Use controversial but respectful takes
- Include data/stats when possible
- Tag relevant influencers (if applicable)
- Time-sensitive language

FORMATTING RULES:
- Short sentences (8-12 words)
- Line breaks every 1-2 sentences
- Strategic emoji use (not excessive)
- Power words: "secret", "finally", "truth", "proven"

Remember: First tweet must be SO compelling they NEED to read more.`,
  };

  return prompts[agentType as keyof typeof prompts] || prompts.title;
}

function buildPrompt(
  agentType: string,
  videoData: { 
    title?: string; 
    transcription?: string;
    duration?: number;
    resolution?: { width: number; height: number };
    format?: string;
  },
  connectedOutputs: Array<{ type: string; content: string }>,
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  }
): string {
  let prompt = "";

  // Add video metadata if available
  if (videoData.duration || videoData.resolution) {
    prompt += "Video Technical Details:\n";
    if (videoData.duration) {
      const minutes = Math.floor(videoData.duration / 60);
      const seconds = Math.floor(videoData.duration % 60);
      prompt += `- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
    }
    if (videoData.resolution) {
      prompt += `- Resolution: ${videoData.resolution.width}x${videoData.resolution.height}`;
      if (videoData.resolution.height >= 2160) prompt += " (4K)";
      else if (videoData.resolution.height >= 1080) prompt += " (HD)";
      prompt += "\n";
    }
    if (videoData.format) {
      prompt += `- Format: ${videoData.format}\n`;
    }
    prompt += "\n";
  }

  // Emphasize transcription-based generation
  if (videoData.transcription) {
    // Analyze transcription for key insights
    const wordCount = videoData.transcription.split(' ').length;
    const estimatedReadTime = Math.ceil(wordCount / 150); // 150 words per minute average speaking rate
    
    prompt += `🎯 CONTENT ANALYSIS:\n`;
    prompt += `- Video length: ${videoData.duration ? Math.floor(videoData.duration / 60) + ' minutes' : estimatedReadTime + ' minutes (estimated)'}\n`;
    prompt += `- Word count: ~${wordCount} words\n`;
    prompt += `- Content depth: ${wordCount > 2000 ? 'In-depth/Tutorial' : wordCount > 800 ? 'Standard' : 'Quick/Short-form'}\n\n`;
    
    prompt += `📝 VIDEO TRANSCRIPTION (Analyze carefully for key points, emotions, and hooks):\n`;
    
    // Include more of the transcription for better context (up to 4000 chars for better understanding)
    const transcriptionPreview = videoData.transcription.length > 4000 
      ? videoData.transcription.slice(0, 4000) + "\n\n[Transcription continues...]"
      : videoData.transcription;
    prompt += `${transcriptionPreview}\n\n`;
    
    if (videoData.title) {
      prompt += `Current Video Title: ${videoData.title}\n\n`;
    }
    
    // Add specific instructions based on agent type
    if (agentType === 'title') {
      prompt += `🎯 TITLE GENERATION REQUIREMENTS:\n\n`;
      
      // Extract key moments from transcription for title focus
      prompt += `📊 KEY CONTENT ANALYSIS:\n`;
      prompt += `Based on the transcription above, focus your title on:\n`;
      prompt += `- The MAIN VALUE viewers will get from this video\n`;
      prompt += `- Any SPECIFIC NUMBERS, stats, or timeframes mentioned\n`;
      prompt += `- The PROBLEM being solved or question being answered\n`;
      prompt += `- Any SURPRISING or counterintuitive points made\n`;
      prompt += `- TRANSFORMATION or results achieved\n\n`;
      
      // Emphasize profile integration
      if (profileData) {
        prompt += `🎨 BRAND-SPECIFIC REQUIREMENTS:\n`;
        prompt += `- This is a ${profileData.contentType} video for ${profileData.channelName}\n`;
        prompt += `- Target audience: ${profileData.targetAudience || 'General viewers'}\n`;
        prompt += `- Brand tone: ${profileData.tone || 'Professional'}\n`;
        prompt += `- Niche focus: ${profileData.niche}\n`;
        prompt += `- IMPORTANT: The title MUST feel authentic to this channel's style\n\n`;
      }
      
      prompt += `✅ TITLE CHECKLIST:\n`;
      prompt += `□ Uses specific details from the transcription (not generic)\n`;
      prompt += `□ Matches the channel's established style and tone\n`;
      prompt += `□ Appeals to the target audience's interests\n`;
      prompt += `□ Under 60 characters (count them!)\n`;
      prompt += `□ Would make YOU click if you saw it\n\n`;
      
      // Add content-type specific examples
      if (profileData?.contentType) {
        prompt += `💡 EXAMPLES FOR ${profileData.contentType.toUpperCase()} CONTENT:\n`;
        
        const examplesByType: Record<string, string[]> = {
          'Gaming': [
            'This Strategy Broke [Game] in 24 Hours',
            'Why Pro Players Hate This One Trick',
            'I Reached Max Level Using Only [Constraint]'
          ],
          'Technology': [
            'The $99 Device That Replaced My $2000 Setup',
            'Apple Didn\'t Want You to Know This',
            '5 GitHub Repos That Will 10x Your Coding'
          ],
          'Education': [
            'Learn [Skill] in 20 Minutes (Science-Based)',
            'MIT\'s Secret Study Method (137% Better)',
            'The Math Trick Schools Don\'t Teach'
          ],
          'Entertainment': [
            'We Tried [Challenge] for 30 Days',
            'Reading My Subscriber\'s Wildest Stories',
            'This Changed Everything (Not Clickbait)'
          ],
          'Lifestyle': [
            'My Morning Routine Saves 3 Hours Daily',
            'Minimalists Are Wrong About This',
            '$20 vs $200: The Shocking Truth'
          ]
        };
        
        const examples = examplesByType[profileData.contentType] || [
          'The Hidden Truth About [Topic]',
          'Why [Common Belief] Is Completely Wrong',
          'I Tested [Method] for 30 Days'
        ];
        
        examples.forEach(example => {
          prompt += `- ${example}\n`;
        });
        prompt += `\nAdapt these patterns to YOUR specific video content!\n\n`;
      }
    } else if (agentType === 'description') {
      prompt += `🎯 DESCRIPTION GENERATION FOCUS:\n`;
      prompt += `- Extract ALL main points discussed in order\n`;
      prompt += `- Identify natural timestamp breaks\n`;
      prompt += `- Find quotable moments for engagement\n\n`;
    } else if (agentType === 'thumbnail') {
      prompt += `🎯 THUMBNAIL GENERATION FOCUS:\n`;
      prompt += `- Identify the most visually representable moment\n`;
      prompt += `- Find emotional peaks in the content\n`;
      prompt += `- Look for before/after, numbers, or shock value\n\n`;
    } else if (agentType === 'tweets') {
      prompt += `🎯 TWEET GENERATION FOCUS:\n`;
      prompt += `- Extract the most shareable insights\n`;
      prompt += `- Find controversial or surprising statements\n`;
      prompt += `- Identify actionable tips mentioned\n\n`;
    }
  } else {
    prompt += `⚠️ LIMITED CONTEXT MODE - No transcription available\n\n`;
    if (videoData.title) {
      prompt += `Video Title: ${videoData.title}\n`;
    }
    prompt += `Generate high-quality ${agentType} content based on the title and any connected content.\n`;
    prompt += `Focus on creating compelling, clickable content that aligns with the title's topic.\n\n`;
  }

  // Add connected agent outputs
  if (connectedOutputs.length > 0) {
    prompt += "Related content from other agents:\n";
    connectedOutputs.forEach(({ type, content }) => {
      prompt += `${type}: ${content}\n`;
    });
    prompt += "\n";
  }

  // Add profile data with strategic emphasis
  if (profileData) {
    prompt += "🎨 BRAND IDENTITY & AUDIENCE:\n";
    prompt += `Channel: ${profileData.channelName}\n`;
    prompt += `Content Vertical: ${profileData.contentType}\n`;
    prompt += `Niche Authority: ${profileData.niche}\n`;
    
    if (profileData.tone) {
      prompt += `Brand Voice: ${profileData.tone}\n`;
      prompt += `IMPORTANT: All content must match this tone consistently!\n`;
    }
    
    if (profileData.targetAudience) {
      prompt += `Target Viewer: ${profileData.targetAudience}\n`;
      prompt += `Optimization: Tailor language, references, and complexity for this audience\n`;
    }
    
    prompt += "\n💡 FINAL INSTRUCTIONS:\n";
    prompt += `- Stay true to the channel's established brand\n`;
    prompt += `- Use language that resonates with the target audience\n`;
    prompt += `- Maintain consistency with existing content style\n`;
    prompt += `- Be authentic to the creator's voice\n`;
  } else {
    prompt += "\n💡 FINAL INSTRUCTIONS:\n";
    prompt += `- Create professional, engaging content\n`;
    prompt += `- Focus on value and viewer retention\n`;
    prompt += `- Use clear, accessible language\n`;
  }

  return prompt;
}