"use client"
import { api } from 'convex/_generated/api'
import { useQuery } from 'convex/react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import VideoPlayer from '../VideoPlayer'
import { Navbar } from './navbar'

interface LoaderData {
    isSignedIn: boolean;
    initialStats?: {
        videosProcessed: number;
        agentsDeployed: number;
        activeAgents: number;
        projectsCreated: number;
        totalUsers: number;
        videosToday: number;
        agentsToday: number;
    } | null;
}

export default function HeroSection({ loaderData }: { loaderData: LoaderData }) {
    const liveStats = useQuery(api.stats.getHeroStats);
    
    // Check if Convex query failed (returns undefined when there's an error)
    const isConvexDown = liveStats === undefined && !loaderData.initialStats;
    
    // Use live stats if available, otherwise fall back to initial stats
    const stats = liveStats || loaderData.initialStats;
    return (
        <section >
            <Navbar loaderData={loaderData} />
            <div className="pt-[4rem] px-[2rem]">
                <div className="text-center">
                    <h1 className="mx-auto mt-16 max-w-xl text-5xl text-balance font-medium">Introducing YouPac AI</h1>
                    <p className="text-muted-foreground mx-auto mb-6 mt-4 text-balance text-xl">Generate compelling titles, descriptions, stunning thumbnails, and viral social media posts.</p>
                    <div className="flex flex-col items-center gap-2 *:w-full sm:flex-row sm:justify-center sm:*:w-auto">
                        <Button
                            asChild={!isConvexDown}
                            size="sm"
                            variant="default"
                            disabled={isConvexDown}>
                            {isConvexDown ? (
                                <span className="text-nowrap">Service Unavailable</span>
                            ) : (
                                <Link to={loaderData?.isSignedIn ? "/dashboard" : "/sign-up"}>
                                    <span className="text-nowrap">Get Started</span>
                                </Link>
                            )}
                        </Button>
                        <Button
                            asChild
                            size="sm"
                            variant="ghost">
                            <Link to="https://x.com/rasmickyy/status/1937171784589029838">
                                <span className="text-nowrap">View Demo</span>
                            </Link>
                        </Button>
                    </div>
                </div>
                {isConvexDown && (
                    <div className="max-w-3xl mx-auto mt-8 mb-6">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                            <div className="text-red-800 font-medium mb-2">
                                🚨 Service Currently Unavailable
                            </div>
                            <div className="text-sm text-red-600 mb-2">
                                YouPac AI is temporarily down for maintenance. All features including video processing, AI agents, and project management are currently unavailable.
                            </div>
                            <div className="text-xs text-red-500">
                                Please check back in a few minutes. We apologize for the inconvenience.
                            </div>
                        </div>
                    </div>
                )}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8 mb-6 max-w-3xl mx-auto">
                        <div className="bg-card/70 backdrop-blur-sm border rounded-lg p-4 text-center transition-all hover:scale-105 hover:bg-card/70">
                            <div className="text-3xl text-balance font-medium">
                                {stats.videosProcessed.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Videos Processed</div>
                        </div>
                        <div className="bg-card/70 backdrop-blur-sm border rounded-lg p-4 text-center transition-all hover:scale-105 hover:bg-card/70">
                            <div className="text-3xl text-balance font-medium">
                                {stats.agentsDeployed.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">AI Agents Deployed</div>
                        </div>
                        <div className="bg-card/70 backdrop-blur-sm border rounded-lg p-4 text-center transition-all hover:scale-105 hover:bg-card/70">
                            <div className="text-3xl text-balance font-medium">
                                {stats.projectsCreated.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">Projects Created</div>
                        </div>
                    </div>
                )}
                <div className="flex justify-center">
                    <VideoPlayer src="https://dwdwn8b5ye.ufs.sh/f/MD2AM9SEY8Gu3B3mczu7JPAkBlwgiWGr6XbOSue4ZFzhR9QK" />
                </div>
            </div>
        </section>
    )
}