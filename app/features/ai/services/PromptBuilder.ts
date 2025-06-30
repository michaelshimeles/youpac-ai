import { AgentType } from "./AIService";

export interface PromptContext {
  videoData?: {
    title?: string;
    transcription?: string;
    manualTranscriptions?: Array<{
      fileName: string;
      text: string;
      format: string;
    }>;
    duration?: number;
    resolution?: { width: number; height: number };
    format?: string;
  };
  profileData?: {
    channelName: string;
    contentType: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  };
  connectedOutputs?: Array<{
    type: string;
    content: string;
  }>;
  moodBoardReferences?: Array<{
    url: string;
    type: string;
    title?: string;
  }>;
  additionalContext?: string;
}

export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
  examples?: string[];
  constraints?: string[];
}

/**
 * Advanced prompt builder for AI content generation
 * Handles complex prompt construction with context awareness
 */
export class PromptBuilder {
  /**
   * Build a complete prompt for content generation
   */
  static buildPrompt(agentType: AgentType, context: PromptContext): PromptTemplate {
    const template = this.getBaseTemplate(agentType);
    const userPrompt = this.buildUserPrompt(agentType, context);
    
    return {
      systemPrompt: template.systemPrompt,
      userPrompt,
      examples: template.examples,
      constraints: template.constraints,
    };
  }

  /**
   * Get base template for each agent type
   */
  private static getBaseTemplate(agentType: AgentType): PromptTemplate {
    const templates = {
      title: {
        systemPrompt: `You are a world-class YouTube title optimization expert with 10+ years of experience. Your titles consistently achieve 10%+ CTR.

CRITICAL ANALYSIS PROCESS:
1. Analyze video content to identify main value proposition
2. Extract specific numbers, results, or outcomes
3. Identify emotional hooks and surprising elements
4. Consider channel brand and audience expectations
5. Optimize for both clickability and accuracy

TITLE OPTIMIZATION RULES:
- Maximum 60 characters (YouTube truncates after this)
- Front-load compelling elements in first 30 characters
- Include 1-2 searchable keywords naturally
- Ensure accuracy to video content
- Test readability at a glance

OUTPUT: Return ONLY the title text, no formatting or prefixes.`,
        examples: [
          "I Tested AI Tools for 30 Days (Results Shocked Me)",
          "The $20 Tool That Replaced My $2000 Setup",
          "Why Pro Developers Hate This One Trick",
        ],
        constraints: [
          "Maximum 60 characters",
          "No clickbait that doesn't match content",
          "Include specific numbers when available",
          "Match channel tone and style",
        ],
      },

      description: {
        systemPrompt: `You are an expert YouTube description writer focused on viewer value and engagement.

DESCRIPTION STRATEGY:
1. Start with immediate value proposition
2. Use scannable formatting with bullet points
3. Include relevant keywords naturally
4. End with clear call-to-action
5. Optimize for both viewers and algorithm

STRUCTURE:
- Opening hook (what viewers will gain)
- Key points or timestamps
- Relevant links/resources
- Engagement prompts
- Channel/creator info

OUTPUT: 2-3 paragraphs focusing on viewer benefits.`,
        examples: [
          "Learn the exact system I use to code 10x faster...",
          "In this video, you'll discover...",
          "🎯 Key takeaways:",
        ],
        constraints: [
          "Focus on viewer benefits",
          "Use scannable formatting",
          "Include timestamps if relevant",
          "End with engagement call-to-action",
        ],
      },

      thumbnail: {
        systemPrompt: `You are a YouTube thumbnail psychology expert specializing in high-CTR designs.

THUMBNAIL PSYCHOLOGY:
1. Visual hierarchy with one clear focal point
2. High contrast colors (Red, Yellow, Blue, White)
3. Emotional expressions that match content
4. Text overlay: 3-5 words maximum
5. Readable at mobile size (120x90px)

DESIGN PRINCIPLES:
- Rule of thirds composition
- Bold, sans-serif fonts
- Contrasting stroke/shadow for text
- Before/after splits for comparisons
- Numbers/arrows for attention direction

OUTPUT: Detailed visual description with specific elements, colors, and text placement.`,
        examples: [
          "Split screen: Before (messy code) vs After (clean code)",
          "Creator pointing at large red arrow pointing to '$10,000'",
          "Shocked expression with 'WORKS?!' text overlay",
        ],
        constraints: [
          "Readable at small sizes",
          "High contrast colors",
          "Maximum 5 words of text",
          "Emotional expression alignment",
        ],
      },

      tweets: {
        systemPrompt: `You are a social media expert creating engaging Twitter threads that drive YouTube views.

TWITTER STRATEGY:
1. Create curiosity without giving everything away
2. Use conversational, natural language
3. Include specific benefits or insights
4. End with clear call-to-action
5. Optimize for engagement and clicks

THREAD FORMAT:
Tweet 1: Hook with curiosity gap
Tweet 2: Key insight or benefit
Tweet 3: Call-to-action with link

OUTPUT: Exactly 2-3 tweets, natural conversational tone.`,
        examples: [
          "Just discovered a coding trick that saves me 2 hours daily...",
          "Here's the one mistake killing your productivity:",
          "Watch the full breakdown here: [link]",
        ],
        constraints: [
          "Conversational tone",
          "Create curiosity",
          "Include specific benefits",
          "Clear call-to-action",
        ],
      },
    };

    return templates[agentType];
  }

  /**
   * Build user prompt with context
   */
  private static buildUserPrompt(agentType: AgentType, context: PromptContext): string {
    let prompt = "";

    // Add video technical details
    if (context.videoData) {
      prompt += this.buildVideoSection(context.videoData);
    }

    // Add transcription analysis
    if (context.videoData?.transcription || context.videoData?.manualTranscriptions) {
      prompt += this.buildTranscriptionSection(context.videoData, agentType);
    }

    // Add connected agent outputs
    if (context.connectedOutputs && context.connectedOutputs.length > 0) {
      prompt += this.buildConnectedOutputsSection(context.connectedOutputs);
    }

    // Add profile/brand context
    if (context.profileData) {
      prompt += this.buildProfileSection(context.profileData, agentType);
    }

    // Add mood board references
    if (context.moodBoardReferences && context.moodBoardReferences.length > 0) {
      prompt += this.buildMoodBoardSection(context.moodBoardReferences);
    }

    // Add agent-specific instructions
    prompt += this.buildAgentSpecificInstructions(agentType, context);

    // Add additional context
    if (context.additionalContext) {
      prompt += `\n🎯 ADDITIONAL REQUIREMENTS:\n${context.additionalContext}\n\n`;
    }

    return prompt;
  }

  /**
   * Build video metadata section
   */
  private static buildVideoSection(videoData: PromptContext["videoData"]): string {
    let section = "📹 VIDEO DETAILS:\n";

    if (videoData?.duration) {
      const minutes = Math.floor(videoData.duration / 60);
      const seconds = Math.floor(videoData.duration % 60);
      section += `- Duration: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
    }

    if (videoData?.resolution) {
      section += `- Resolution: ${videoData.resolution.width}x${videoData.resolution.height}`;
      if (videoData.resolution.height >= 2160) section += " (4K)";
      else if (videoData.resolution.height >= 1080) section += " (HD)";
      section += "\n";
    }

    if (videoData?.format) {
      section += `- Format: ${videoData.format}\n`;
    }

    return section + "\n";
  }

  /**
   * Build transcription analysis section
   */
  private static buildTranscriptionSection(
    videoData: PromptContext["videoData"],
    agentType: AgentType
  ): string {
    let section = "";

    // Manual transcriptions (higher priority)
    if (videoData?.manualTranscriptions && videoData.manualTranscriptions.length > 0) {
      section += "📄 MANUAL TRANSCRIPTIONS:\n";
      videoData.manualTranscriptions.forEach((transcript, index) => {
        section += `\n--- ${transcript.fileName} (${transcript.format.toUpperCase()}) ---\n`;
        const preview = transcript.text.length > 2000 
          ? transcript.text.slice(0, 2000) + "\n[Content continues...]"
          : transcript.text;
        section += `${preview}\n`;
      });
      section += "\n";
    }

    // Auto transcription
    if (videoData?.transcription) {
      const wordCount = videoData.transcription.split(' ').length;
      const estimatedReadTime = Math.ceil(wordCount / 150);

      section += "🎯 CONTENT ANALYSIS:\n";
      section += `- Estimated length: ${estimatedReadTime} minutes\n`;
      section += `- Word count: ~${wordCount} words\n`;
      section += `- Content depth: ${wordCount > 2000 ? 'In-depth' : wordCount > 800 ? 'Standard' : 'Quick'}\n\n`;

      section += "📝 VIDEO TRANSCRIPTION:\n";
      const transcriptionPreview = videoData.transcription.length > 4000 
        ? videoData.transcription.slice(0, 4000) + "\n[Content continues...]"
        : videoData.transcription;
      section += `${transcriptionPreview}\n\n`;
    }

    // Add agent-specific analysis instructions
    section += this.getTranscriptionAnalysisInstructions(agentType);

    return section;
  }

  /**
   * Build connected outputs section
   */
  private static buildConnectedOutputsSection(outputs: Array<{ type: string; content: string }>): string {
    let section = "🔗 CONNECTED CONTENT:\n";
    
    outputs.forEach(({ type, content }) => {
      section += `- ${type}: ${content}\n`;
    });
    
    return section + "\n";
  }

  /**
   * Build profile/brand section
   */
  private static buildProfileSection(
    profileData: PromptContext["profileData"],
    agentType: AgentType
  ): string {
    let section = "🎨 BRAND IDENTITY:\n";
    section += `- Channel: ${profileData!.channelName}\n`;
    section += `- Content Type: ${profileData!.contentType}\n`;
    section += `- Niche: ${profileData!.niche}\n`;
    
    if (profileData!.tone) {
      section += `- Brand Voice: ${profileData!.tone}\n`;
    }
    
    if (profileData!.targetAudience) {
      section += `- Target Audience: ${profileData!.targetAudience}\n`;
    }

    section += "\n💡 BRAND CONSISTENCY REQUIREMENTS:\n";
    section += "- Match the channel's established style\n";
    section += "- Use language appropriate for target audience\n";
    section += "- Maintain consistency with existing content\n";
    section += "- Be authentic to the creator's voice\n\n";

    return section;
  }

  /**
   * Build mood board section
   */
  private static buildMoodBoardSection(references: Array<{ url: string; type: string; title?: string }>): string {
    let section = "🎨 MOOD BOARD REFERENCES:\n";
    section += "Use these for creative inspiration and direction:\n\n";
    
    references.forEach((ref, index) => {
      const typeLabel = ref.type.charAt(0).toUpperCase() + ref.type.slice(1);
      section += `${index + 1}. [${typeLabel}] ${ref.title || ref.url}\n`;
      
      switch (ref.type) {
        case "youtube":
          section += "   → Study style, pacing, and engagement techniques\n";
          break;
        case "music":
          section += "   → Match energy, mood, and emotional tone\n";
          break;
        case "image":
          section += "   → Draw visual inspiration and aesthetic cues\n";
          break;
        default:
          section += "   → Consider overall vibe and approach\n";
      }
    });
    
    section += "\nBlend these references creatively - don't copy directly.\n\n";
    return section;
  }

  /**
   * Get transcription analysis instructions per agent type
   */
  private static getTranscriptionAnalysisInstructions(agentType: AgentType): string {
    const instructions = {
      title: `🎯 TITLE ANALYSIS FOCUS:
- Identify the main value proposition and outcomes
- Extract specific numbers, statistics, or timeframes
- Find surprising or counterintuitive points
- Note emotional peaks and transformation moments
- Look for unique angles or perspectives\n\n`,

      description: `🎯 DESCRIPTION ANALYSIS FOCUS:
- Extract main points and key takeaways
- Identify natural timestamp breaks
- Find quotable moments for engagement
- Note practical applications and benefits\n\n`,

      thumbnail: `🎯 THUMBNAIL ANALYSIS FOCUS:
- Identify most visually representable moments
- Find emotional peaks and reactions
- Look for before/after comparisons
- Note numbers, statistics, or shock value elements\n\n`,

      tweets: `🎯 SOCIAL MEDIA ANALYSIS FOCUS:
- Extract most shareable insights
- Find controversial or surprising statements
- Identify actionable tips and advice
- Note quotable one-liners\n\n`,
    };

    return instructions[agentType];
  }

  /**
   * Build agent-specific instructions
   */
  private static buildAgentSpecificInstructions(agentType: AgentType, context: PromptContext): string {
    const instructions = {
      title: this.buildTitleInstructions(context),
      description: this.buildDescriptionInstructions(context),
      thumbnail: this.buildThumbnailInstructions(context),
      tweets: this.buildTweetsInstructions(context),
    };

    return instructions[agentType];
  }

  private static buildTitleInstructions(context: PromptContext): string {
    let instructions = "✅ TITLE CREATION CHECKLIST:\n";
    instructions += "□ Uses specific details from content (not generic)\n";
    instructions += "□ Under 60 characters total\n";
    instructions += "□ Front-loads compelling element\n";
    instructions += "□ Matches channel brand and tone\n";
    instructions += "□ Creates curiosity without misleading\n";
    instructions += "□ Includes relevant keywords naturally\n\n";

    if (context.profileData?.contentType) {
      instructions += this.getContentTypeExamples(context.profileData.contentType);
    }

    return instructions;
  }

  private static buildDescriptionInstructions(context: PromptContext): string {
    return `✅ DESCRIPTION REQUIREMENTS:
□ Start with immediate value proposition
□ Use scannable formatting (bullets/numbers)
□ Include relevant keywords naturally
□ Focus on viewer benefits
□ End with engagement call-to-action
□ Keep paragraphs short (2-3 sentences max)

FORMAT STRUCTURE:
1. Opening hook (what viewers will gain)
2. Key points or main sections
3. Call-to-action for engagement

`;
  }

  private static buildThumbnailInstructions(context: PromptContext): string {
    return `✅ THUMBNAIL DESIGN REQUIREMENTS:
□ One clear focal point (face/object/text)
□ High contrast colors (Red/Yellow/Blue/White)
□ Text overlay: 3-5 words maximum
□ Readable at mobile size (120x90px)
□ Emotional expression matches content
□ 16:9 aspect ratio optimized for YouTube

VISUAL HIERARCHY:
- Primary element: Main subject/face
- Secondary element: Text overlay
- Background: Supporting visuals

`;
  }

  private static buildTweetsInstructions(context: PromptContext): string {
    return `✅ TWITTER THREAD REQUIREMENTS:
□ Conversational and natural tone
□ Creates curiosity gap
□ Specific benefit or insight mentioned
□ Clear call-to-action
□ No jargon or complex language
□ Appropriate hashtags if relevant

THREAD STRUCTURE:
Tweet 1: Hook with curiosity
Tweet 2: Key insight/benefit
Tweet 3: Call-to-action with link placeholder

`;
  }

  /**
   * Get content type specific examples
   */
  private static getContentTypeExamples(contentType: string): string {
    const examples: Record<string, string[]> = {
      Gaming: [
        "This Strategy Broke [Game] in 24 Hours",
        "Why Pro Players Hate This One Trick",
        "I Reached Max Level Using Only [Constraint]"
      ],
      Technology: [
        "The $99 Device That Replaced My $2000 Setup",
        "Apple Didn't Want You to Know This",
        "5 GitHub Repos That Will 10x Your Coding"
      ],
      Education: [
        "Learn [Skill] in 20 Minutes (Science-Based)",
        "MIT's Secret Study Method (137% Better)",
        "The Math Trick Schools Don't Teach"
      ],
      Entertainment: [
        "We Tried [Challenge] for 30 Days",
        "Reading My Subscriber's Wildest Stories",
        "This Changed Everything (Not Clickbait)"
      ],
      Lifestyle: [
        "My Morning Routine Saves 3 Hours Daily",
        "Minimalists Are Wrong About This",
        "$20 vs $200: The Shocking Truth"
      ]
    };

    const typeExamples = examples[contentType] || [
      "The Hidden Truth About [Topic]",
      "Why [Common Belief] Is Completely Wrong",
      "I Tested [Method] for 30 Days"
    ];

    let section = `💡 ${contentType.toUpperCase()} TITLE EXAMPLES:\n`;
    typeExamples.forEach(example => {
      section += `- ${example}\n`;
    });
    section += "\nAdapt these patterns to your specific content!\n\n";

    return section;
  }
}