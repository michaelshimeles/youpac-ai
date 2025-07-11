"use client";

// this is a client component
import { useEffect } from "react";
import { Link } from "react-router";
import { renderCanvas, ShineBorder, TypeWriter } from "~/components/ui/hero-designali";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Navbar } from "./navbar";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

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

export default function Hero({
  loaderData,
}: {
  loaderData?: LoaderData;
}) {
  const liveStats = useQuery(api.stats.getHeroStats);
  // Use live stats if available, otherwise fall back to initial stats
  const stats = liveStats || loaderData?.initialStats;

  const talkAbout = [
    "Video Titles",
    "Descriptions",
    "Thumbnails",
    "Social Posts",
    "SEO Content",
    "AI Magic",
    "YouTube Growth",
  ];

  useEffect(() => {
    renderCanvas();
  }, []);

  return (
    <main className="overflow-hidden">
      <section id="home">
        <Navbar loaderData={loaderData} />
        <div className="absolute inset-0 max-md:hidden top-[400px] -z-10 h-[400px] w-full bg-transparent bg-[linear-gradient(to_right,#57534e_1px,transparent_1px),linear-gradient(to_bottom,#57534e_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:bg-[linear-gradient(to_right,#a8a29e_1px,transparent_1px),linear-gradient(to_bottom,#a8a29e_1px,transparent_1px)]"></div>
        <div className="flex flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 mt-10 sm:justify-center md:mb-4 md:mt-40">
            <div className="relative flex items-center rounded-full border bg-popover px-3 py-1 text-xs text-primary/60">
              Introducing YouPac AI.
              <Link
                to="/dashboard"
                rel="noreferrer"
                className="ml-1 flex items-center font-semibold"
              >
                <div
                  className="absolute inset-0 hover:font-semibold hover:text-primary flex"
                  aria-hidden="true"
                />
                Explore <span aria-hidden="true"></span>
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-5xl">
            <div className="border-text-primary relative mx-auto h-full bg-background border py-12 p-6 [mask-image:radial-gradient(800rem_96rem_at_center,white,transparent)]">

              <h1 className="flex flex-col text-center text-5xl font-semibold leading-none tracking-tight md:flex-col md:text-8xl lg:flex-row lg:text-8xl">
                <Plus
                  strokeWidth={4}
                  className="text-primary absolute -left-5 -top-5 h-10 w-10"
                />
                <Plus
                  strokeWidth={4}
                  className="text-primary absolute -bottom-5 -left-5 h-10 w-10"
                />
                <Plus
                  strokeWidth={4}
                  className="text-primary absolute -right-5 -top-5 h-10 w-10"
                />
                <Plus
                  strokeWidth={4}
                  className="text-primary absolute -bottom-5 -right-5 h-10 w-10"
                />
                <span>
                  Package Your YouTube Content Better With{" "}
                  <span className="bg-gradient-to-r from-blue-500 via-primary to-cyan-500 bg-clip-text text-transparent">AI</span>
                </span>
              </h1>
              <div className="flex items-center mt-4 justify-center gap-1">
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                <p className="text-xs text-green-500">Available Now</p>
              </div>
            </div>

            <h1 className="mt-8 text-2xl md:text-2xl">
              Generate compelling titles, descriptions, stunning thumbnails, and viral social media posts.
            </h1>

            <p className="text-primary/60 py-4">
              All powered by cutting-edge AI, designed for YouTube creators.
            </p>

            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 mb-8 max-w-2xl mx-auto">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative border-text-primary border rounded-lg p-6 text-center bg-background">
                      <Plus strokeWidth={3} className="text-primary absolute -left-2 -top-2 h-5 w-5" />
                      <div className="text-4xl font-semibold text-black">
                        {stats.videosProcessed.toLocaleString()}
                      </div>
                      <div className="text-sm text-black/60 mt-2">Videos Processed</div>
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-pink-500 rounded-lg blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative border-text-primary border rounded-lg p-6 text-center bg-background">
                      <Plus strokeWidth={3} className="text-primary absolute -right-2 -top-2 h-5 w-5" />
                      <div className="text-4xl font-semibold text-black">
                        {stats.agentsDeployed.toLocaleString()}
                      </div>
                      <div className="text-sm text-black/60 mt-2">AI Agents</div>
                    </div>
                  </div>
                  <div className="relative group col-span-2 md:col-span-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                    <div className="relative border-text-primary border rounded-lg p-6 text-center bg-background">
                      <Plus strokeWidth={3} className="text-primary absolute -left-2 -bottom-2 h-5 w-5" />
                      <Plus strokeWidth={3} className="text-primary absolute -right-2 -bottom-2 h-5 w-5" />
                      <div className="text-4xl font-semibold text-black">
                        {stats.projectsCreated.toLocaleString()}
                      </div>
                      <div className="text-sm text-black/60 mt-2">Projects Created</div>
                    </div>
                  </div>
                </div>
            )}
            <div className="flex items-center justify-center gap-2">
              <Link to={loaderData?.isSignedIn ? "/dashboard" : "/sign-up"}>
                <ShineBorder
                  borderWidth={3}
                  className="border cursor-pointer h-auto w-auto p-2 bg-white/5 backdrop-blur-md dark:bg-black/5"
                  color={["#FF007F", "#39FF14", "#00FFFF"]}
                >
                  <Button className="w-full rounded-xl" >
                    Start Creating
                  </Button>
                </ShineBorder>
              </Link>
              <Link to={"https://github.com/michaelshimeles/youpac-ai"} target="_blank">
                <Button className="rounded-xl" variant="outline">View on GitHub</Button>
              </Link>
            </div>
          </div>
        </div>
        <canvas
          className="pointer-events-none absolute inset-0 mx-auto"
          id="canvas"
        ></canvas>
      </section>
      <div
        className="absolute left-1/2 top-0 -z-10 -translate-x-1/2"
        style={{
          width: "1512px",
          height: "550px",
          background: "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
        }}
        role="presentation"
      />
    </main>
  );
};