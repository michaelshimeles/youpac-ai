import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Id } from "~/convex/_generated/dataModel";

export interface Project {
  _id: Id<"projects">;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  isShared?: boolean;
  shareToken?: string;
}

export interface ProjectStats {
  videoCount: number;
  agentCount: number;
  lastActivity: number;
}

interface ProjectState {
  // Current project
  currentProject: Project | null;
  projectStats: ProjectStats | null;
  
  // Project list
  projects: Project[];
  isLoadingProjects: boolean;
  
  // UI state
  selectedProjectId: Id<"projects"> | null;
  showProjectSelector: boolean;
  
  // Recent projects for quick access
  recentProjects: Id<"projects">[];
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjectStats: (stats: ProjectStats | null) => void;
  setProjects: (projects: Project[]) => void;
  setLoadingProjects: (loading: boolean) => void;
  setSelectedProjectId: (id: Id<"projects"> | null) => void;
  setShowProjectSelector: (show: boolean) => void;
  
  // Project operations
  addProject: (project: Project) => void;
  updateProject: (id: Id<"projects">, updates: Partial<Project>) => void;
  removeProject: (id: Id<"projects">) => void;
  addToRecent: (id: Id<"projects">) => void;
  
  // Getters
  getProjectById: (id: Id<"projects">) => Project | undefined;
  getRecentProjects: () => Project[];
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentProject: null,
        projectStats: null,
        projects: [],
        isLoadingProjects: false,
        selectedProjectId: null,
        showProjectSelector: false,
        recentProjects: [],
        
        // Basic setters
        setCurrentProject: (project) => {
          set({ currentProject: project });
          if (project) {
            get().addToRecent(project._id);
          }
        },
        
        setProjectStats: (stats) => set({ projectStats: stats }),
        setProjects: (projects) => set({ projects }),
        setLoadingProjects: (loading) => set({ isLoadingProjects: loading }),
        setSelectedProjectId: (id) => set({ selectedProjectId: id }),
        setShowProjectSelector: (show) => set({ showProjectSelector: show }),
        
        // Project operations
        addProject: (project) => set((state) => ({
          projects: [project, ...state.projects]
        })),
        
        updateProject: (id, updates) => set((state) => ({
          projects: state.projects.map(project =>
            project._id === id ? { ...project, ...updates } : project
          ),
          currentProject: state.currentProject?._id === id
            ? { ...state.currentProject, ...updates }
            : state.currentProject
        })),
        
        removeProject: (id) => set((state) => ({
          projects: state.projects.filter(project => project._id !== id),
          currentProject: state.currentProject?._id === id ? null : state.currentProject,
          recentProjects: state.recentProjects.filter(recentId => recentId !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
        })),
        
        addToRecent: (id) => set((state) => {
          const filtered = state.recentProjects.filter(recentId => recentId !== id);
          return {
            recentProjects: [id, ...filtered].slice(0, 5) // Keep last 5
          };
        }),
        
        // Getters
        getProjectById: (id) => get().projects.find(project => project._id === id),
        
        getRecentProjects: () => {
          const state = get();
          return state.recentProjects
            .map(id => state.projects.find(project => project._id === id))
            .filter(Boolean) as Project[];
        },
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          // Persist recent projects and UI preferences
          recentProjects: state.recentProjects,
          showProjectSelector: state.showProjectSelector,
        }),
      }
    ),
    {
      name: 'project-store',
    }
  )
);