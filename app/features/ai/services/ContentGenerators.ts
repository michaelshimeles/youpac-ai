import { AIService, AgentType, ContentGenerationOptions } from "./AIService";

export interface TitleGeneratorOptions {
  transcription?: string;
  currentTitle?: string;
  channelStyle?: {
    niche: string;
    tone: string;
    targetAudience: string;
  };
  contentType?: "tutorial" | "review" | "entertainment" | "educational" | "news";
  keywords?: string[];
}

export interface DescriptionGeneratorOptions {
  transcription?: string;
  title?: string;
  timestamps?: Array<{ time: string; description: string }>;
  channelInfo?: {
    channelName: string;
    niche: string;
  };
  callToAction?: string;
}

export interface SocialMediaOptions {
  platform: "twitter" | "linkedin" | "facebook" | "instagram";
  videoTitle?: string;
  keyPoints?: string[];
  hashtags?: string[];
  channelHandle?: string;
}

/**
 * Specialized content generators for different types of YouTube content
 * Provides pre-configured generation options for common use cases
 */
export class ContentGenerators {
  constructor(private aiService: AIService) {}

  /**
   * Generate optimized titles using proven formulas
   */
  async generateOptimizedTitle(options: TitleGeneratorOptions): Promise<string> {
    const generationOptions: ContentGenerationOptions = {
      agentType: "title" as AgentType,
      videoData: {
        transcription: options.transcription,
        title: options.currentTitle,
      },
      profileData: options.channelStyle ? {
        channelName: "Channel",
        contentType: options.contentType || "educational",
        niche: options.channelStyle.niche,
        tone: options.channelStyle.tone,
        targetAudience: options.channelStyle.targetAudience,
      } : undefined,
    };

    const result = await this.aiService.generateContent(generationOptions);
    return this.aiService.formatContentForDisplay(result.content, "title");
  }

  /**
   * Generate comprehensive video descriptions
   */
  async generateDescription(options: DescriptionGeneratorOptions): Promise<string> {
    const generationOptions: ContentGenerationOptions = {
      agentType: "description" as AgentType,
      videoData: {
        transcription: options.transcription,
        title: options.title,
      },
      profileData: options.channelInfo ? {
        channelName: options.channelInfo.channelName,
        contentType: "educational",
        niche: options.channelInfo.niche,
      } : undefined,
    };

    const result = await this.aiService.generateContent(generationOptions);
    return this.aiService.formatContentForDisplay(result.content, "description");
  }

  /**
   * Generate social media content for video promotion
   */
  async generateSocialMedia(
    platform: SocialMediaOptions["platform"],
    options: Omit<SocialMediaOptions, "platform">
  ): Promise<string> {
    const generationOptions: ContentGenerationOptions = {
      agentType: "tweets" as AgentType, // Use tweets generator for all social platforms
      videoData: {
        title: options.videoTitle,
        transcription: options.keyPoints?.join(". "),
      },
    };

    const result = await this.aiService.generateContent(generationOptions);
    return this.formatSocialContent(result.content, platform, options);
  }

  /**
   * Generate content for specific YouTube niches
   */
  async generateNicheContent(
    niche: "tech" | "gaming" | "education" | "lifestyle" | "business",
    agentType: AgentType,
    videoData: ContentGenerationOptions["videoData"]
  ): Promise<string> {
    const nicheProfiles = {
      tech: {
        channelName: "Tech Channel",
        contentType: "Technology",
        niche: "Tech Reviews & Tutorials",
        tone: "Professional yet accessible",
        targetAudience: "Tech enthusiasts and professionals",
      },
      gaming: {
        channelName: "Gaming Channel",
        contentType: "Gaming",
        niche: "Game Reviews & Walkthroughs",
        tone: "Enthusiastic and engaging",
        targetAudience: "Gamers aged 16-35",
      },
      education: {
        channelName: "Educational Channel",
        contentType: "Education",
        niche: "Online Learning & Tutorials",
        tone: "Clear and authoritative",
        targetAudience: "Students and lifelong learners",
      },
      lifestyle: {
        channelName: "Lifestyle Channel",
        contentType: "Lifestyle",
        niche: "Life Improvement & Wellness",
        tone: "Friendly and inspiring",
        targetAudience: "Young adults seeking improvement",
      },
      business: {
        channelName: "Business Channel",
        contentType: "Business",
        niche: "Entrepreneurship & Business Growth",
        tone: "Professional and motivational",
        targetAudience: "Entrepreneurs and business professionals",
      },
    };

    const profile = nicheProfiles[niche];
    const generationOptions: ContentGenerationOptions = {
      agentType,
      videoData,
      profileData: profile,
    };

    const result = await this.aiService.generateContent(generationOptions);
    return this.aiService.formatContentForDisplay(result.content, agentType);
  }

  /**
   * Generate content variations for A/B testing
   */
  async generateVariations(
    agentType: AgentType,
    baseOptions: ContentGenerationOptions,
    variationCount: number = 3
  ): Promise<Array<{ variation: string; style: string }>> {
    const styles = [
      { tone: "Professional", style: "formal" },
      { tone: "Casual", style: "conversational" },
      { tone: "Enthusiastic", style: "energetic" },
      { tone: "Authoritative", style: "expert" },
      { tone: "Friendly", style: "approachable" },
    ];

    const variations = await Promise.all(
      styles.slice(0, variationCount).map(async (style) => {
        const options: ContentGenerationOptions = {
          ...baseOptions,
          profileData: {
            ...baseOptions.profileData!,
            tone: style.tone,
          },
        };

        const result = await this.aiService.generateContent(options);
        return {
          variation: this.aiService.formatContentForDisplay(result.content, agentType),
          style: style.style,
        };
      })
    );

    return variations;
  }

  /**
   * Generate content series for related videos
   */
  async generateSeriesContent(
    seriesTheme: string,
    videoCount: number,
    baseVideoData: ContentGenerationOptions["videoData"]
  ): Promise<Array<{ title: string; description: string; episodeNumber: number }>> {
    const series = [];

    for (let i = 1; i <= videoCount; i++) {
      const episodeData = {
        ...baseVideoData,
        title: `${seriesTheme} - Episode ${i}`,
      };

      const [titleResult, descResult] = await Promise.all([
        this.aiService.generateContent({
          agentType: "title" as AgentType,
          videoData: episodeData,
        }),
        this.aiService.generateContent({
          agentType: "description" as AgentType,
          videoData: episodeData,
        }),
      ]);

      series.push({
        title: this.aiService.formatContentForDisplay(titleResult.content, "title"),
        description: this.aiService.formatContentForDisplay(descResult.content, "description"),
        episodeNumber: i,
      });
    }

    return series;
  }

  /**
   * Generate trending content based on current topics
   */
  async generateTrendingContent(
    agentType: AgentType,
    trendingKeywords: string[],
    baseVideoData: ContentGenerationOptions["videoData"]
  ): Promise<string> {
    const trendingContext = `Current trending topics: ${trendingKeywords.join(", ")}`;
    
    const options: ContentGenerationOptions = {
      agentType,
      videoData: {
        ...baseVideoData,
        transcription: baseVideoData.transcription 
          ? `${baseVideoData.transcription}\n\nTrending context: ${trendingContext}`
          : trendingContext,
      },
    };

    const result = await this.aiService.generateContent(options);
    return this.aiService.formatContentForDisplay(result.content, agentType);
  }

  /**
   * Generate content with SEO optimization
   */
  async generateSEOOptimizedContent(
    agentType: AgentType,
    targetKeywords: string[],
    videoData: ContentGenerationOptions["videoData"]
  ): Promise<{ content: string; keywordDensity: Record<string, number> }> {
    const seoContext = `Target SEO keywords: ${targetKeywords.join(", ")}`;
    
    const options: ContentGenerationOptions = {
      agentType,
      videoData: {
        ...videoData,
        transcription: videoData.transcription 
          ? `${videoData.transcription}\n\nSEO context: ${seoContext}`
          : seoContext,
      },
    };

    const result = await this.aiService.generateContent(options);
    const content = this.aiService.formatContentForDisplay(result.content, agentType);
    
    // Calculate keyword density
    const keywordDensity: Record<string, number> = {};
    const contentLower = content.toLowerCase();
    
    targetKeywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const matches = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      keywordDensity[keyword] = matches;
    });

    return { content, keywordDensity };
  }

  /**
   * Format social media content for specific platforms
   */
  private formatSocialContent(
    content: string,
    platform: SocialMediaOptions["platform"],
    options: Omit<SocialMediaOptions, "platform">
  ): string {
    const cleanContent = this.aiService.formatContentForDisplay(content, "tweets");
    
    switch (platform) {
      case "twitter":
        // Twitter formatting (already optimized)
        return cleanContent;
        
      case "linkedin":
        // LinkedIn formatting - more professional
        return `🎥 New video: ${options.videoTitle}\n\n${cleanContent}\n\n${options.hashtags?.map(tag => `#${tag}`).join(" ") || ""}`;
        
      case "facebook":
        // Facebook formatting - more casual
        return `📺 Check out my latest video: ${options.videoTitle}\n\n${cleanContent}\n\n${options.hashtags?.map(tag => `#${tag}`).join(" ") || ""}`;
        
      case "instagram":
        // Instagram formatting - visual focus
        return `${cleanContent}\n\n🎬 Link in bio\n\n${options.hashtags?.map(tag => `#${tag}`).join(" ") || ""}`;
        
      default:
        return cleanContent;
    }
  }
}