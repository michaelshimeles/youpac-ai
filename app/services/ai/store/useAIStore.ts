import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Id } from "~/convex/_generated/dataModel";

export type AgentType = 'title' | 'description' | 'thumbnail' | 'tweets';
export type AgentStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface Agent {
  _id: Id<"agents">;
  type: AgentType;
  status: AgentStatus;
  draft: string;
  projectId: Id<"projects">;
  videoId?: Id<"videos">;
  canvasPosition: { x: number; y: number };
  createdAt: number;
  chatHistory?: Array<{
    role: 'user' | 'ai';
    message: string;
    timestamp: number;
  }>;
}

export interface GenerationRequest {
  agentId: Id<"agents">;
  agentType: AgentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: string;
  error?: string;
  startTime: number;
  endTime?: number;
}

export interface ContentVariation {
  id: string;
  content: string;
  style: string;
  rating?: number;
  isSelected?: boolean;
}

interface AIState {
  // Agents
  agents: Agent[];
  isLoadingAgents: boolean;
  
  // Generation state
  activeGenerations: GenerationRequest[];
  generationQueue: GenerationRequest[];
  
  // Content variations for A/B testing
  contentVariations: Record<string, ContentVariation[]>; // agentId -> variations
  
  // Chat state
  chatHistory: Record<string, Array<{
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
    agentId?: string;
  }>>; // projectId -> messages
  
  // UI state
  selectedAgentId: Id<"agents"> | null;
  showGenerationProgress: boolean;
  expandedAgents: Set<string>;
  
  // Settings
  generationSettings: {
    temperature: number;
    maxTokens: number;
    useAdvancedPrompts: boolean;
    generateVariations: boolean;
    variationCount: number;
  };
  
  // Actions - Agents
  setAgents: (agents: Agent[]) => void;
  setLoadingAgents: (loading: boolean) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: Id<"agents">, updates: Partial<Agent>) => void;
  removeAgent: (agentId: Id<"agents">) => void;
  setSelectedAgent: (agentId: Id<"agents"> | null) => void;
  
  // Actions - Generation
  startGeneration: (request: GenerationRequest) => void;
  updateGeneration: (agentId: Id<"agents">, updates: Partial<GenerationRequest>) => void;
  completeGeneration: (agentId: Id<"agents">, result: string) => void;
  failGeneration: (agentId: Id<"agents">, error: string) => void;
  clearCompletedGenerations: () => void;
  
  // Actions - Content variations
  setContentVariations: (agentId: string, variations: ContentVariation[]) => void;
  addContentVariation: (agentId: string, variation: ContentVariation) => void;
  selectVariation: (agentId: string, variationId: string) => void;
  rateVariation: (agentId: string, variationId: string, rating: number) => void;
  
  // Actions - Chat
  addChatMessage: (projectId: string, message: {
    role: 'user' | 'ai';
    content: string;
    agentId?: string;
  }) => void;
  clearChatHistory: (projectId: string) => void;
  
  // Actions - UI
  setShowGenerationProgress: (show: boolean) => void;
  toggleAgentExpanded: (agentId: string) => void;
  collapseAllAgents: () => void;
  
  // Actions - Settings
  updateGenerationSettings: (settings: Partial<AIState['generationSettings']>) => void;
  
  // Getters
  getAgentById: (agentId: Id<"agents">) => Agent | undefined;
  getAgentsByType: (type: AgentType) => Agent[];
  getAgentsByProject: (projectId: Id<"projects">) => Agent[];
  getActiveGenerations: () => GenerationRequest[];
  getCompletedGenerations: () => GenerationRequest[];
  getFailedGenerations: () => GenerationRequest[];
  isGenerating: (agentId?: Id<"agents">) => boolean;
  getGenerationProgress: (agentId: Id<"agents">) => GenerationRequest | undefined;
}

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => ({
      // Initial state
      agents: [],
      isLoadingAgents: false,
      activeGenerations: [],
      generationQueue: [],
      contentVariations: {},
      chatHistory: {},
      selectedAgentId: null,
      showGenerationProgress: false,
      expandedAgents: new Set(),
      generationSettings: {
        temperature: 0.7,
        maxTokens: 300,
        useAdvancedPrompts: true,
        generateVariations: false,
        variationCount: 3,
      },
      
      // Agent actions
      setAgents: (agents) => set({ agents }),
      setLoadingAgents: (loading) => set({ isLoadingAgents: loading }),
      
      addAgent: (agent) => set((state) => ({
        agents: [...state.agents, agent]
      })),
      
      updateAgent: (agentId, updates) => set((state) => ({
        agents: state.agents.map(agent =>
          agent._id === agentId ? { ...agent, ...updates } : agent
        )
      })),
      
      removeAgent: (agentId) => set((state) => ({
        agents: state.agents.filter(agent => agent._id !== agentId),
        activeGenerations: state.activeGenerations.filter(gen => gen.agentId !== agentId),
        generationQueue: state.generationQueue.filter(gen => gen.agentId !== agentId),
        selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId,
      })),
      
      setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),
      
      // Generation actions
      startGeneration: (request) => set((state) => {
        // Remove any existing generation for this agent
        const filteredActive = state.activeGenerations.filter(gen => gen.agentId !== request.agentId);
        const filteredQueue = state.generationQueue.filter(gen => gen.agentId !== request.agentId);
        
        return {
          activeGenerations: [...filteredActive, request],
          generationQueue: filteredQueue,
        };
      }),
      
      updateGeneration: (agentId, updates) => set((state) => ({
        activeGenerations: state.activeGenerations.map(gen =>
          gen.agentId === agentId ? { ...gen, ...updates } : gen
        )
      })),
      
      completeGeneration: (agentId, result) => set((state) => {
        const generation = state.activeGenerations.find(gen => gen.agentId === agentId);
        const updatedGeneration = generation ? {
          ...generation,
          status: 'completed' as const,
          endTime: Date.now(),
        } : null;
        
        return {
          activeGenerations: state.activeGenerations.filter(gen => gen.agentId !== agentId),
          agents: state.agents.map(agent =>
            agent._id === agentId 
              ? { ...agent, status: 'ready' as const, draft: result }
              : agent
          ),
        };
      }),
      
      failGeneration: (agentId, error) => set((state) => {
        const generation = state.activeGenerations.find(gen => gen.agentId === agentId);
        const updatedGeneration = generation ? {
          ...generation,
          status: 'failed' as const,
          error,
          endTime: Date.now(),
        } : null;
        
        return {
          activeGenerations: state.activeGenerations.filter(gen => gen.agentId !== agentId),
          agents: state.agents.map(agent =>
            agent._id === agentId 
              ? { ...agent, status: 'error' as const }
              : agent
          ),
        };
      }),
      
      clearCompletedGenerations: () => set((state) => ({
        activeGenerations: state.activeGenerations.filter(gen => 
          gen.status === 'pending' || gen.status === 'processing'
        )
      })),
      
      // Content variation actions
      setContentVariations: (agentId, variations) => set((state) => ({
        contentVariations: {
          ...state.contentVariations,
          [agentId]: variations,
        }
      })),
      
      addContentVariation: (agentId, variation) => set((state) => ({
        contentVariations: {
          ...state.contentVariations,
          [agentId]: [...(state.contentVariations[agentId] || []), variation],
        }
      })),
      
      selectVariation: (agentId, variationId) => set((state) => ({
        contentVariations: {
          ...state.contentVariations,
          [agentId]: (state.contentVariations[agentId] || []).map(variation => ({
            ...variation,
            isSelected: variation.id === variationId,
          })),
        }
      })),
      
      rateVariation: (agentId, variationId, rating) => set((state) => ({
        contentVariations: {
          ...state.contentVariations,
          [agentId]: (state.contentVariations[agentId] || []).map(variation =>
            variation.id === variationId 
              ? { ...variation, rating }
              : variation
          ),
        }
      })),
      
      // Chat actions
      addChatMessage: (projectId, message) => set((state) => {
        const messageWithId = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...message,
          timestamp: Date.now(),
        };
        
        return {
          chatHistory: {
            ...state.chatHistory,
            [projectId]: [...(state.chatHistory[projectId] || []), messageWithId],
          }
        };
      }),
      
      clearChatHistory: (projectId) => set((state) => ({
        chatHistory: {
          ...state.chatHistory,
          [projectId]: [],
        }
      })),
      
      // UI actions
      setShowGenerationProgress: (show) => set({ showGenerationProgress: show }),
      
      toggleAgentExpanded: (agentId) => set((state) => {
        const newExpanded = new Set(state.expandedAgents);
        if (newExpanded.has(agentId)) {
          newExpanded.delete(agentId);
        } else {
          newExpanded.add(agentId);
        }
        return { expandedAgents: newExpanded };
      }),
      
      collapseAllAgents: () => set({ expandedAgents: new Set() }),
      
      // Settings actions
      updateGenerationSettings: (settings) => set((state) => ({
        generationSettings: { ...state.generationSettings, ...settings }
      })),
      
      // Getters
      getAgentById: (agentId) => get().agents.find(agent => agent._id === agentId),
      
      getAgentsByType: (type) => get().agents.filter(agent => agent.type === type),
      
      getAgentsByProject: (projectId) => get().agents.filter(agent => agent.projectId === projectId),
      
      getActiveGenerations: () => get().activeGenerations.filter(gen => 
        gen.status === 'pending' || gen.status === 'processing'
      ),
      
      getCompletedGenerations: () => get().activeGenerations.filter(gen => 
        gen.status === 'completed'
      ),
      
      getFailedGenerations: () => get().activeGenerations.filter(gen => 
        gen.status === 'failed'
      ),
      
      isGenerating: (agentId) => {
        const state = get();
        if (agentId) {
          return state.activeGenerations.some(gen => 
            gen.agentId === agentId && (gen.status === 'pending' || gen.status === 'processing')
          );
        }
        return state.activeGenerations.some(gen => 
          gen.status === 'pending' || gen.status === 'processing'
        );
      },
      
      getGenerationProgress: (agentId) => 
        get().activeGenerations.find(gen => gen.agentId === agentId),
    }),
    {
      name: 'ai-store',
    }
  )
);