import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Id } from "~/convex/_generated/dataModel";

export interface CanvasNode {
  id: string;
  type: 'video' | 'agent' | 'transcription' | 'moodboard';
  position: { x: number; y: number };
  data: any;
  selected?: boolean;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface UploadProgress {
  nodeId: string;
  progress: number;
  stage: string;
}

export interface GenerationProgress {
  current: number;
  total: number;
  currentAgent?: string;
}

interface CanvasState {
  // Canvas state
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: CanvasViewport;
  selectedNodeIds: string[];
  
  // UI state
  isDragging: boolean;
  showMiniMap: boolean;
  enableEdgeAnimations: boolean;
  isSidebarCollapsed: boolean;
  
  // Loading states
  isLoading: boolean;
  uploadProgress: UploadProgress | null;
  generationProgress: GenerationProgress | null;
  isGeneratingAll: boolean;
  
  // Modals
  modals: {
    video: { open: boolean; data?: any };
    transcription: { open: boolean; data?: any };
    thumbnail: { open: boolean; data?: any };
    preview: { open: boolean; data?: any };
    prompt: { open: boolean; data?: any };
    content: { open: boolean; data?: any };
    deleteConfirmation: { open: boolean; data?: any };
  };
  
  // Actions - Canvas manipulation
  setNodes: (nodes: CanvasNode[]) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  setViewport: (viewport: CanvasViewport) => void;
  addNode: (node: CanvasNode) => void;
  updateNode: (nodeId: string, updates: Partial<CanvasNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: CanvasEdge) => void;
  removeEdge: (edgeId: string) => void;
  
  // Actions - Selection
  selectNode: (nodeId: string) => void;
  selectNodes: (nodeIds: string[]) => void;
  deselectAll: () => void;
  toggleNodeSelection: (nodeId: string) => void;
  
  // Actions - UI state
  setDragging: (isDragging: boolean) => void;
  setShowMiniMap: (show: boolean) => void;
  setEnableEdgeAnimations: (enable: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Actions - Loading states
  setLoading: (loading: boolean) => void;
  setUploadProgress: (progress: UploadProgress | null) => void;
  setGenerationProgress: (progress: GenerationProgress | null) => void;
  setIsGeneratingAll: (generating: boolean) => void;
  
  // Actions - Modals
  openModal: (modal: keyof CanvasState['modals'], data?: any) => void;
  closeModal: (modal: keyof CanvasState['modals']) => void;
  closeAllModals: () => void;
  
  // Actions - Canvas operations
  arrangeNodes: () => void;
  fitView: () => void;
  resetCanvas: () => void;
  duplicateNode: (nodeId: string) => void;
  
  // Getters
  getNodeById: (nodeId: string) => CanvasNode | undefined;
  getConnectedNodes: (nodeId: string) => CanvasNode[];
  getSelectedNodes: () => CanvasNode[];
  getNodesByType: (type: CanvasNode['type']) => CanvasNode[];
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    (set, get) => ({
      // Initial state
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      
      isDragging: false,
      showMiniMap: true,
      enableEdgeAnimations: true,
      isSidebarCollapsed: false,
      
      isLoading: false,
      uploadProgress: null,
      generationProgress: null,
      isGeneratingAll: false,
      
      modals: {
        video: { open: false },
        transcription: { open: false },
        thumbnail: { open: false },
        preview: { open: false },
        prompt: { open: false },
        content: { open: false },
        deleteConfirmation: { open: false },
      },
      
      // Canvas manipulation actions
      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),
      setViewport: (viewport) => set({ viewport }),
      
      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node]
      })),
      
      updateNode: (nodeId, updates) => set((state) => ({
        nodes: state.nodes.map(node => 
          node.id === nodeId ? { ...node, ...updates } : node
        )
      })),
      
      removeNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter(node => node.id !== nodeId),
        edges: state.edges.filter(edge => 
          edge.source !== nodeId && edge.target !== nodeId
        ),
        selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId)
      })),
      
      addEdge: (edge) => set((state) => ({
        edges: [...state.edges, edge]
      })),
      
      removeEdge: (edgeId) => set((state) => ({
        edges: state.edges.filter(edge => edge.id !== edgeId)
      })),
      
      // Selection actions
      selectNode: (nodeId) => set((state) => ({
        selectedNodeIds: [nodeId],
        nodes: state.nodes.map(node => ({
          ...node,
          selected: node.id === nodeId
        }))
      })),
      
      selectNodes: (nodeIds) => set((state) => ({
        selectedNodeIds: nodeIds,
        nodes: state.nodes.map(node => ({
          ...node,
          selected: nodeIds.includes(node.id)
        }))
      })),
      
      deselectAll: () => set((state) => ({
        selectedNodeIds: [],
        nodes: state.nodes.map(node => ({
          ...node,
          selected: false
        }))
      })),
      
      toggleNodeSelection: (nodeId) => set((state) => {
        const isSelected = state.selectedNodeIds.includes(nodeId);
        const newSelectedIds = isSelected
          ? state.selectedNodeIds.filter(id => id !== nodeId)
          : [...state.selectedNodeIds, nodeId];
        
        return {
          selectedNodeIds: newSelectedIds,
          nodes: state.nodes.map(node => ({
            ...node,
            selected: newSelectedIds.includes(node.id)
          }))
        };
      }),
      
      // UI state actions
      setDragging: (isDragging) => set({ isDragging }),
      setShowMiniMap: (show) => set({ showMiniMap: show }),
      setEnableEdgeAnimations: (enable) => set({ enableEdgeAnimations: enable }),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      
      // Loading state actions
      setLoading: (loading) => set({ isLoading: loading }),
      setUploadProgress: (progress) => set({ uploadProgress: progress }),
      setGenerationProgress: (progress) => set({ generationProgress: progress }),
      setIsGeneratingAll: (generating) => set({ isGeneratingAll: generating }),
      
      // Modal actions
      openModal: (modal, data) => set((state) => ({
        modals: {
          ...state.modals,
          [modal]: { open: true, data }
        }
      })),
      
      closeModal: (modal) => set((state) => ({
        modals: {
          ...state.modals,
          [modal]: { open: false, data: undefined }
        }
      })),
      
      closeAllModals: () => set((state) => ({
        modals: Object.keys(state.modals).reduce((acc, key) => ({
          ...acc,
          [key]: { open: false, data: undefined }
        }), {} as CanvasState['modals'])
      })),
      
      // Canvas operation actions
      arrangeNodes: () => set((state) => {
        const nodeSpacing = { x: 400, y: 300 };
        const startPosition = { x: 100, y: 100 };
        
        // Group nodes by type
        const nodesByType = state.nodes.reduce((acc, node) => {
          if (!acc[node.type]) acc[node.type] = [];
          acc[node.type].push(node);
          return acc;
        }, {} as Record<string, CanvasNode[]>);
        
        let currentY = startPosition.y;
        const arrangedNodes = [...state.nodes];
        
        Object.entries(nodesByType).forEach(([type, typeNodes]) => {
          let currentX = startPosition.x;
          
          typeNodes.forEach((node, index) => {
            const nodeIndex = arrangedNodes.findIndex(n => n.id === node.id);
            if (nodeIndex !== -1) {
              arrangedNodes[nodeIndex] = {
                ...arrangedNodes[nodeIndex],
                position: { x: currentX, y: currentY }
              };
            }
            
            currentX += nodeSpacing.x;
            
            // Start new row after 3 nodes
            if ((index + 1) % 3 === 0) {
              currentX = startPosition.x;
              currentY += nodeSpacing.y / 2;
            }
          });
          
          currentY += nodeSpacing.y;
        });
        
        return { nodes: arrangedNodes };
      }),
      
      fitView: () => set((state) => {
        if (state.nodes.length === 0) {
          return { viewport: { x: 0, y: 0, zoom: 1 } };
        }
        
        // Calculate bounds
        const bounds = state.nodes.reduce(
          (acc, node) => ({
            minX: Math.min(acc.minX, node.position.x),
            maxX: Math.max(acc.maxX, node.position.x + 300),
            minY: Math.min(acc.minY, node.position.y),
            maxY: Math.max(acc.maxY, node.position.y + 200),
          }),
          { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
        );
        
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const viewportWidth = 1200;
        const viewportHeight = 800;
        const padding = 100;
        
        const zoomX = (viewportWidth - padding * 2) / width;
        const zoomY = (viewportHeight - padding * 2) / height;
        const zoom = Math.min(zoomX, zoomY, 1);
        
        return {
          viewport: {
            x: -centerX * zoom + viewportWidth / 2,
            y: -centerY * zoom + viewportHeight / 2,
            zoom,
          }
        };
      }),
      
      resetCanvas: () => set({
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        selectedNodeIds: [],
        uploadProgress: null,
        generationProgress: null,
        isGeneratingAll: false,
      }),
      
      duplicateNode: (nodeId) => set((state) => {
        const nodeToDuplicate = state.nodes.find(node => node.id === nodeId);
        if (!nodeToDuplicate) return state;
        
        const newNodeId = `${nodeToDuplicate.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNode: CanvasNode = {
          ...nodeToDuplicate,
          id: newNodeId,
          position: {
            x: nodeToDuplicate.position.x + 50,
            y: nodeToDuplicate.position.y + 50,
          },
          selected: false,
        };
        
        return {
          nodes: [...state.nodes, newNode]
        };
      }),
      
      // Getters
      getNodeById: (nodeId) => get().nodes.find(node => node.id === nodeId),
      
      getConnectedNodes: (nodeId) => {
        const state = get();
        const connectedIds = state.edges
          .filter(edge => edge.source === nodeId || edge.target === nodeId)
          .map(edge => edge.source === nodeId ? edge.target : edge.source);
        
        return state.nodes.filter(node => connectedIds.includes(node.id));
      },
      
      getSelectedNodes: () => {
        const state = get();
        return state.nodes.filter(node => state.selectedNodeIds.includes(node.id));
      },
      
      getNodesByType: (type) => get().nodes.filter(node => node.type === type),
    }),
    {
      name: 'canvas-store',
      partialize: (state) => ({
        // Only persist UI preferences
        showMiniMap: state.showMiniMap,
        enableEdgeAnimations: state.enableEdgeAnimations,
        isSidebarCollapsed: state.isSidebarCollapsed,
      }),
    }
  )
);