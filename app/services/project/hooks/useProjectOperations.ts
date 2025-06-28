import { useQuery, useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";
import { Id } from "~/convex/_generated/dataModel";
import { useProjectStore } from "~/services/project/store/useProjectStore";
import { Project, ProjectSettings } from "~/types/project";
import { useState, useCallback, useEffect } from "react";

/**
 * Hook for project CRUD operations
 */
export function useProjectOperations() {
  const {
    projects,
    currentProject,
    setProjects,
    setCurrentProject,
    addProject,
    updateProject,
    removeProject,
    setLoadingProjects,
  } = useProjectStore();

  // Queries
  const allProjects = useQuery(api.projects.list, {});
  const createProjectMutation = useMutation(api.projects.create);
  const updateProjectMutation = useMutation(api.projects.update);
  const deleteProjectMutation = useMutation(api.projects.remove);

  // Load projects from database
  useEffect(() => {
    if (allProjects !== undefined) {
      setProjects(allProjects);
      setLoadingProjects(false);
    } else {
      setLoadingProjects(true);
    }
  }, [allProjects, setProjects, setLoadingProjects]);

  const createProject = useCallback(async (projectData: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
  }) => {
    const projectId = await createProjectMutation({
      title: projectData.title,
      description: projectData.description,
    });

    const newProject: Project = {
      _id: projectId,
      title: projectData.title,
      description: projectData.description,
      settings: getDefaultProjectSettings(),
      stats: getDefaultProjectStats(),
      isShared: false,
      tags: projectData.tags || [],
      category: projectData.category,
      status: "active",
      lastActivity: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId: "", // Will be set by the mutation
      _creationTime: Date.now(),
    };

    addProject(newProject);
    return projectId;
  }, [createProjectMutation, addProject]);

  const updateProjectData = useCallback(async (
    projectId: Id<"projects">,
    updates: Partial<Project>
  ) => {
    await updateProjectMutation({
      id: projectId,
      ...updates,
    });

    updateProject(projectId, updates);
  }, [updateProjectMutation, updateProject]);

  const deleteProject = useCallback(async (projectId: Id<"projects">) => {
    await deleteProjectMutation({ id: projectId });
    removeProject(projectId);

    // If this was the current project, clear it
    if (currentProject?._id === projectId) {
      setCurrentProject(null);
    }
  }, [deleteProjectMutation, removeProject, currentProject, setCurrentProject]);

  const duplicateProject = useCallback(async (projectId: Id<"projects">) => {
    const originalProject = projects.find(p => p._id === projectId);
    if (!originalProject) throw new Error("Project not found");

    const duplicatedProjectId = await createProject({
      title: `${originalProject.title} (Copy)`,
      description: originalProject.description,
      category: originalProject.category,
      tags: originalProject.tags,
    });

    return duplicatedProjectId;
  }, [projects, createProject]);

  const archiveProject = useCallback(async (projectId: Id<"projects">) => {
    await updateProjectData(projectId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  }, [updateProjectData]);

  const restoreProject = useCallback(async (projectId: Id<"projects">) => {
    await updateProjectData(projectId, {
      status: "active",
      updatedAt: Date.now(),
    });
  }, [updateProjectData]);

  return {
    projects,
    currentProject,
    createProject,
    updateProject: updateProjectData,
    deleteProject,
    duplicateProject,
    archiveProject,
    restoreProject,
    setCurrentProject,
    isLoading: allProjects === undefined,
  };
}

/**
 * Hook for project settings management
 */
export function useProjectSettings(projectId?: Id<"projects">) {
  const project = useQuery(api.projects.get, projectId ? { id: projectId } : "skip");
  const updateProjectMutation = useMutation(api.projects.update);
  const { updateProject } = useProjectStore();

  const [isUpdating, setIsUpdating] = useState(false);

  const updateSettings = useCallback(async (
    settingsUpdate: Partial<ProjectSettings>
  ) => {
    if (!projectId || !project) return;

    setIsUpdating(true);
    try {
      const newSettings = {
        ...project.settings,
        ...settingsUpdate,
      };

      await updateProjectMutation({
        id: projectId,
        settings: newSettings,
      });

      updateProject(projectId, {
        settings: newSettings,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to update project settings:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [projectId, project, updateProjectMutation, updateProject]);

  const resetSettings = useCallback(async () => {
    if (!projectId) return;

    const defaultSettings = getDefaultProjectSettings();
    await updateSettings(defaultSettings);
  }, [projectId, updateSettings]);

  const updateAISettings = useCallback(async (
    aiSettings: Partial<ProjectSettings['aiSettings']>
  ) => {
    if (!project) return;

    await updateSettings({
      aiSettings: {
        ...project.settings.aiSettings,
        ...aiSettings,
      },
    });
  }, [project, updateSettings]);

  const updateCanvasSettings = useCallback(async (
    canvasSettings: Partial<ProjectSettings['canvasSettings']>
  ) => {
    if (!project) return;

    await updateSettings({
      canvasSettings: {
        ...project.settings.canvasSettings,
        ...canvasSettings,
      },
    });
  }, [project, updateSettings]);

  const updateVideoSettings = useCallback(async (
    videoSettings: Partial<ProjectSettings['videoSettings']>
  ) => {
    if (!project) return;

    await updateSettings({
      videoSettings: {
        ...project.settings.videoSettings,
        ...videoSettings,
      },
    });
  }, [project, updateSettings]);

  return {
    project,
    settings: project?.settings,
    updateSettings,
    resetSettings,
    updateAISettings,
    updateCanvasSettings,
    updateVideoSettings,
    isUpdating,
    isLoading: project === undefined && projectId !== undefined,
  };
}

/**
 * Hook for project collaboration features
 */
export function useProjectCollaboration(projectId: Id<"projects">) {
  const project = useQuery(api.projects.get, { id: projectId });
  const shareProjectMutation = useMutation(api.projects.share);
  const addCollaboratorMutation = useMutation(api.projects.addCollaborator);
  const removeCollaboratorMutation = useMutation(api.projects.removeCollaborator);

  const [isSharing, setIsSharing] = useState(false);

  const shareProject = useCallback(async (options: {
    type: "view" | "edit" | "comment";
    expiresAt?: Date;
    password?: string;
  }) => {
    setIsSharing(true);
    try {
      const result = await shareProjectMutation({
        projectId,
        ...options,
      });
      return result;
    } catch (error) {
      console.error("Failed to share project:", error);
      throw error;
    } finally {
      setIsSharing(false);
    }
  }, [projectId, shareProjectMutation]);

  const addCollaborator = useCallback(async (
    email: string,
    role: "editor" | "viewer" | "commenter"
  ) => {
    await addCollaboratorMutation({
      projectId,
      email,
      role,
    });
  }, [projectId, addCollaboratorMutation]);

  const removeCollaborator = useCallback(async (userId: string) => {
    await removeCollaboratorMutation({
      projectId,
      userId,
    });
  }, [projectId, removeCollaboratorMutation]);

  const generateShareUrl = useCallback((shareToken: string) => {
    return `${window.location.origin}/shared/${shareToken}`;
  }, []);

  return {
    project,
    collaborators: project?.collaborators || [],
    shareProject,
    addCollaborator,
    removeCollaborator,
    generateShareUrl,
    isSharing,
    isShared: project?.isShared || false,
    shareToken: project?.shareToken,
  };
}

/**
 * Hook for project analytics and statistics
 */
export function useProjectAnalytics(projectId: Id<"projects">) {
  const projectVideos = useQuery(api.videos.listByProject, { projectId });
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  
  const [analytics, setAnalytics] = useState<{
    overview: {
      totalNodes: number;
      totalConnections: number;
      completedGenerations: number;
      processingTime: number;
    };
    contentBreakdown: {
      byType: Record<string, number>;
      byStatus: Record<string, number>;
    };
    timeline: Array<{
      date: string;
      activity: number;
      type: string;
    }>;
  } | null>(null);

  const calculateAnalytics = useCallback(() => {
    if (!projectVideos || !projectAgents) return;

    const videos = projectVideos;
    const agents = projectAgents;

    // Overview statistics
    const totalNodes = videos.length + agents.length;
    const completedGenerations = agents.filter(agent => agent.status === "ready").length;

    // Content breakdown
    const agentsByType = agents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const agentsByStatus = agents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Timeline data (simplified)
    const timeline = [
      { date: "2024-01-01", activity: videos.length, type: "videos" },
      { date: "2024-01-02", activity: agents.length, type: "agents" },
    ];

    setAnalytics({
      overview: {
        totalNodes,
        totalConnections: 0, // Would need edge data
        completedGenerations,
        processingTime: 0, // Would need timing data
      },
      contentBreakdown: {
        byType: agentsByType,
        byStatus: agentsByStatus,
      },
      timeline,
    });
  }, [projectVideos, projectAgents]);

  useEffect(() => {
    calculateAnalytics();
  }, [calculateAnalytics]);

  const exportAnalytics = useCallback((format: "json" | "csv" = "json") => {
    if (!analytics) return null;

    const data = {
      projectId,
      generatedAt: new Date().toISOString(),
      analytics,
    };

    if (format === "csv") {
      // Convert to CSV format
      const csvData = Object.entries(analytics.contentBreakdown.byType)
        .map(([type, count]) => `${type},${count}`)
        .join('\n');
      
      return `Type,Count\n${csvData}`;
    }

    return JSON.stringify(data, null, 2);
  }, [analytics, projectId]);

  return {
    analytics,
    exportAnalytics,
    isLoading: projectVideos === undefined || projectAgents === undefined,
  };
}

/**
 * Hook for project templates
 */
export function useProjectTemplates() {
  const [templates] = useState([
    {
      id: "youtube-video",
      name: "YouTube Video Production",
      description: "Complete workflow for YouTube video content creation",
      category: "video",
      tags: ["youtube", "video", "content"],
      nodeTemplates: [
        { type: "video", position: { x: 100, y: 100 }, config: {} },
        { type: "agent", position: { x: 500, y: 100 }, config: { agentType: "title" } },
        { type: "agent", position: { x: 500, y: 300 }, config: { agentType: "description" } },
        { type: "agent", position: { x: 500, y: 500 }, config: { agentType: "thumbnail" } },
      ],
    },
    {
      id: "social-media",
      name: "Social Media Content",
      description: "Create content for multiple social platforms",
      category: "social",
      tags: ["social", "twitter", "content"],
      nodeTemplates: [
        { type: "video", position: { x: 100, y: 200 } },
        { type: "agent", position: { x: 500, y: 200 }, config: { agentType: "tweets" } },
      ],
    },
  ]);

  const applyTemplate = useCallback(async (
    templateId: string,
    projectId: Id<"projects">
  ) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error("Template not found");

    // This would create nodes based on the template
    console.log(`Applying template ${templateId} to project ${projectId}`);
    
    return template.nodeTemplates;
  }, [templates]);

  return {
    templates,
    applyTemplate,
  };
}

// Helper functions
function getDefaultProjectSettings(): ProjectSettings {
  return {
    aiSettings: {
      defaultModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 300,
      useAdvancedPrompts: true,
      autoGenerate: false,
    },
    canvasSettings: {
      autoLayout: false,
      snapToGrid: false,
      showMiniMap: true,
      enableAnimations: true,
      theme: "light",
    },
    videoSettings: {
      autoTranscribe: true,
      transcriptionService: "elevenlabs",
      extractMetadata: true,
      generateThumbnails: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    },
    exportSettings: {
      defaultFormat: "json",
      includeWatermark: false,
      quality: "high",
    },
    notifications: {
      emailUpdates: true,
      generationComplete: true,
      transcriptionComplete: true,
      errorAlerts: true,
    },
  };
}

function getDefaultProjectStats() {
  return {
    videoCount: 0,
    agentCount: 0,
    transcriptionCount: 0,
    moodBoardCount: 0,
    agentsByType: {
      title: 0,
      description: 0,
      thumbnail: 0,
      tweets: 0,
    },
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    totalTranscriptions: 0,
    totalProcessingTime: 0,
    totalTokensUsed: 0,
    totalStorageUsed: 0,
    createdThisWeek: 0,
    createdThisMonth: 0,
    lastActivity: Date.now(),
  };
}