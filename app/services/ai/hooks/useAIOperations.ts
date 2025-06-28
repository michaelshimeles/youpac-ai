import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { useAIService } from "~/services/ServiceProvider";
import { useAIStore } from "~/services/ai/store/useAIStore";
import { AgentType, ContentGenerationRequest, ContentRefinementRequest } from "~/types/ai";
import { useState, useCallback, useEffect } from "react";

/**
 * Hook for AI content generation operations
 */
export function useContentGeneration() {
  const aiService = useAIService();
  const { 
    agents, 
    startGeneration, 
    completeGeneration, 
    failGeneration,
    isGenerating,
    getGenerationProgress 
  } = useAIStore();
  
  const generateContentAction = useAction(api.aiHackathon.generateContentSimple);

  const generateContent = useCallback(async (request: ContentGenerationRequest) => {
    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    startGeneration({
      agentId: generationId as Id<"agents">,
      agentType: request.agentType,
      status: "processing",
      startTime: Date.now(),
    });

    try {
      const result = await generateContentAction({
        agentType: request.agentType,
        videoId: request.videoId,
        videoData: request.videoData,
        connectedAgentOutputs: request.connectedAgentOutputs || [],
        moodBoardReferences: request.moodBoardReferences,
        profileData: request.profileData,
      });

      completeGeneration(generationId as Id<"agents">, result.content);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      failGeneration(generationId as Id<"agents">, errorMessage);
      throw error;
    }
  }, [generateContentAction, startGeneration, completeGeneration, failGeneration]);

  const generateMultiple = useCallback(async (requests: ContentGenerationRequest[]) => {
    const results = await Promise.allSettled(
      requests.map(request => generateContent(request))
    );

    return results.map((result, index) => ({
      request: requests[index],
      success: result.status === "fulfilled",
      data: result.status === "fulfilled" ? result.value : undefined,
      error: result.status === "rejected" ? result.reason?.message : undefined,
    }));
  }, [generateContent]);

  return {
    generateContent,
    generateMultiple,
    isGenerating: (agentId?: Id<"agents">) => isGenerating(agentId),
    getProgress: getGenerationProgress,
  };
}

/**
 * Hook for agent operations
 */
export function useAgentOperations(projectId: Id<"projects">) {
  const { agents, addAgent, updateAgent, removeAgent } = useAIStore();
  
  // Queries
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  
  // Mutations
  const createAgentMutation = useMutation(api.agents.create);
  const updateAgentMutation = useMutation(api.agents.updateDraft);
  const deleteAgentMutation = useMutation(api.agents.remove);

  const createAgent = useCallback(async (
    type: AgentType,
    videoId?: Id<"videos">,
    position: { x: number; y: number } = { x: 100, y: 100 }
  ) => {
    const agentId = await createAgentMutation({
      projectId,
      type,
      videoId,
      canvasPosition: position,
    });

    // Add to store
    addAgent({
      _id: agentId,
      type,
      status: "idle",
      draft: "",
      projectId,
      videoId,
      canvasPosition: position,
      createdAt: Date.now(),
      userId: "", // Will be set by the mutation
    });

    return agentId;
  }, [createAgentMutation, addAgent, projectId]);

  const updateAgentDraft = useCallback(async (
    agentId: Id<"agents">,
    draft: string,
    status: "idle" | "generating" | "ready" | "error" = "ready"
  ) => {
    await updateAgentMutation({
      id: agentId,
      draft,
      status,
    });

    updateAgent(agentId, { draft, status });
  }, [updateAgentMutation, updateAgent]);

  const deleteAgent = useCallback(async (agentId: Id<"agents">) => {
    await deleteAgentMutation({ id: agentId });
    removeAgent(agentId);
  }, [deleteAgentMutation, removeAgent]);

  const getAgentsByType = useCallback((type: AgentType) => {
    return (projectAgents || []).filter(agent => agent.type === type);
  }, [projectAgents]);

  const getConnectedAgents = useCallback((videoId: Id<"videos">) => {
    return (projectAgents || []).filter(agent => agent.videoId === videoId);
  }, [projectAgents]);

  return {
    agents: projectAgents || [],
    createAgent,
    updateAgentDraft,
    deleteAgent,
    getAgentsByType,
    getConnectedAgents,
    isLoading: projectAgents === undefined,
  };
}

/**
 * Hook for AI content refinement
 */
export function useContentRefinement() {
  const aiService = useAIService();
  const refineContentAction = useAction(api.ai.refineContent);
  const [isRefining, setIsRefining] = useState<Record<string, boolean>>({});

  const refineContent = useCallback(async (request: ContentRefinementRequest) => {
    const agentKey = request.agentId;
    setIsRefining(prev => ({ ...prev, [agentKey]: true }));

    try {
      const result = await refineContentAction({
        agentId: request.agentId,
        userMessage: request.userMessage,
        currentDraft: request.currentDraft,
        videoData: request.videoData,
        connectedAgentOutputs: request.connectedAgentOutputs,
        profileData: request.profileData,
      });

      return result;
    } catch (error) {
      console.error("Content refinement error:", error);
      throw error;
    } finally {
      setIsRefining(prev => ({ ...prev, [agentKey]: false }));
    }
  }, [refineContentAction]);

  const isRefiningAgent = useCallback((agentId: Id<"agents">) => {
    return isRefining[agentId] || false;
  }, [isRefining]);

  return {
    refineContent,
    isRefiningAgent,
  };
}

/**
 * Hook for AI thumbnail generation
 */
export function useThumbnailGeneration() {
  const generateThumbnailAction = useAction(api.thumbnail.generateThumbnail);
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [generationProgress, setGenerationProgress] = useState<Record<string, string>>({});

  const generateThumbnail = useCallback(async (options: {
    videoId?: Id<"videos">;
    videoFrames: Array<{ dataUrl: string; timestamp: number }>;
    videoData: any;
    connectedAgentOutputs?: any[];
    profileData?: any;
    additionalContext?: string;
    moodBoardReferences?: any[];
  }) => {
    const requestKey = options.videoId || "thumbnail-gen";
    setIsGenerating(prev => ({ ...prev, [requestKey]: true }));
    setGenerationProgress(prev => ({ ...prev, [requestKey]: "Starting generation..." }));

    try {
      const result = await generateThumbnailAction({
        agentType: "thumbnail",
        videoId: options.videoId,
        videoFrames: options.videoFrames,
        videoData: options.videoData,
        connectedAgentOutputs: options.connectedAgentOutputs || [],
        profileData: options.profileData,
        additionalContext: options.additionalContext,
        moodBoardReferences: options.moodBoardReferences,
      });

      setGenerationProgress(prev => ({ ...prev, [requestKey]: "Generation complete!" }));
      return result;
    } catch (error) {
      setGenerationProgress(prev => ({ ...prev, [requestKey]: "Generation failed" }));
      throw error;
    } finally {
      setIsGenerating(prev => ({ ...prev, [requestKey]: false }));
    }
  }, [generateThumbnailAction]);

  const isGeneratingThumbnail = useCallback((key: string) => {
    return isGenerating[key] || false;
  }, [isGenerating]);

  const getThumbnailProgress = useCallback((key: string) => {
    return generationProgress[key];
  }, [generationProgress]);

  return {
    generateThumbnail,
    isGeneratingThumbnail,
    getThumbnailProgress,
  };
}

/**
 * Hook for batch AI operations
 */
export function useBatchAIOperations() {
  const { generateContent } = useContentGeneration();
  const [batchStatus, setBatchStatus] = useState<{
    isRunning: boolean;
    completed: number;
    total: number;
    current?: string;
    errors: Array<{ request: any; error: string }>;
  }>({
    isRunning: false,
    completed: 0,
    total: 0,
    errors: [],
  });

  const runBatch = useCallback(async (
    requests: ContentGenerationRequest[],
    options: {
      parallelLimit?: number;
      onProgress?: (completed: number, total: number, current?: string) => void;
    } = {}
  ) => {
    const { parallelLimit = 3, onProgress } = options;
    
    setBatchStatus({
      isRunning: true,
      completed: 0,
      total: requests.length,
      errors: [],
    });

    const results: Array<{ success: boolean; data?: any; error?: string }> = [];
    const errors: Array<{ request: any; error: string }> = [];

    // Process requests in batches
    for (let i = 0; i < requests.length; i += parallelLimit) {
      const batch = requests.slice(i, i + parallelLimit);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (request) => {
          setBatchStatus(prev => ({ ...prev, current: `Generating ${request.agentType}...` }));
          return await generateContent(request);
        })
      );

      batchResults.forEach((result, batchIndex) => {
        const requestIndex = i + batchIndex;
        const request = requests[requestIndex];

        if (result.status === "fulfilled") {
          results.push({ success: true, data: result.value });
        } else {
          const error = result.reason?.message || "Unknown error";
          results.push({ success: false, error });
          errors.push({ request, error });
        }

        setBatchStatus(prev => {
          const newCompleted = prev.completed + 1;
          onProgress?.(newCompleted, prev.total, prev.current);
          return { ...prev, completed: newCompleted };
        });
      });
    }

    setBatchStatus(prev => ({
      ...prev,
      isRunning: false,
      current: undefined,
      errors,
    }));

    return {
      results,
      summary: {
        total: requests.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        errors,
      },
    };
  }, [generateContent]);

  const cancelBatch = useCallback(() => {
    setBatchStatus(prev => ({
      ...prev,
      isRunning: false,
      current: "Cancelled",
    }));
  }, []);

  return {
    runBatch,
    cancelBatch,
    batchStatus,
    isRunning: batchStatus.isRunning,
    progress: batchStatus.total > 0 ? (batchStatus.completed / batchStatus.total) * 100 : 0,
  };
}

/**
 * Hook for AI performance tracking
 */
export function useAIPerformance() {
  const [metrics, setMetrics] = useState<{
    averageGenerationTime: Record<AgentType, number>;
    successRates: Record<AgentType, number>;
    totalGenerations: Record<AgentType, number>;
  }>({
    averageGenerationTime: {} as Record<AgentType, number>,
    successRates: {} as Record<AgentType, number>,
    totalGenerations: {} as Record<AgentType, number>,
  });

  const trackGeneration = useCallback((
    agentType: AgentType,
    startTime: number,
    endTime: number,
    success: boolean
  ) => {
    const duration = endTime - startTime;
    
    setMetrics(prev => {
      const currentAvg = prev.averageGenerationTime[agentType] || 0;
      const currentTotal = prev.totalGenerations[agentType] || 0;
      const currentSuccessful = (prev.successRates[agentType] || 0) * currentTotal;

      const newTotal = currentTotal + 1;
      const newAvg = (currentAvg * currentTotal + duration) / newTotal;
      const newSuccessful = currentSuccessful + (success ? 1 : 0);
      const newSuccessRate = newSuccessful / newTotal;

      return {
        ...prev,
        averageGenerationTime: { ...prev.averageGenerationTime, [agentType]: newAvg },
        successRates: { ...prev.successRates, [agentType]: newSuccessRate },
        totalGenerations: { ...prev.totalGenerations, [agentType]: newTotal },
      };
    });
  }, []);

  return {
    metrics,
    trackGeneration,
  };
}