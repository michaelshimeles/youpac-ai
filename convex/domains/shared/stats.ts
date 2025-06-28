import { query } from "../../_generated/server";

export const getHeroStats = query({
  args: {},
  handler: async (ctx) => {
    
    // Get total videos in the system
    const allVideos = await ctx.db.query("videos").collect();
    const processedVideos = allVideos.length;

    // Get total agents deployed (all agents)
    const totalAgents = await ctx.db.query("agents").collect();
    const agentsDeployed = totalAgents.length;

    // Get active agents (agents that are ready or generating)
    const activeAgents = totalAgents.filter(
      agent => agent.status === "ready" || agent.status === "generating"
    ).length;

    // Get total projects created
    const totalProjects = await ctx.db.query("projects").collect();
    const projectsCreated = totalProjects.length;

    // Get total users
    const totalUsers = await ctx.db.query("users").collect();
    const usersCount = totalUsers.length;

    // Get today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    const videosToday = allVideos.filter(
      video => video.createdAt && video.createdAt >= todayTimestamp
    ).length;

    const agentsToday = totalAgents.filter(
      agent => agent.createdAt && agent.createdAt >= todayTimestamp
    ).length;

    return {
      videosProcessed: processedVideos,
      agentsDeployed: agentsDeployed,
      activeAgents: activeAgents,
      projectsCreated: projectsCreated,
      totalUsers: usersCount,
      videosToday: videosToday,
      agentsToday: agentsToday,
    };
  },
});

export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    // Get recent projects
    const recentProjects = await ctx.db
      .query("projects")
      .order("desc")
      .take(5);

    // Get recent agents
    const recentAgents = await ctx.db
      .query("agents")
      .order("desc")
      .take(5);

    return {
      recentProjects,
      recentAgents,
    };
  },
});