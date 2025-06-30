import { getAuth } from "@clerk/react-router/ssr.server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import Footer from "../components/footer";
import HeroSection from "../components/hero-section";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
  const title = "YouTube AI Assistant - Streamline Your Video Content Creation";
  const description =
    "AI-powered assistant for YouTube creators. Generate optimized titles, descriptions, thumbnails, and social media posts for your videos using advanced AI technology.";
  const keywords = "YouTube, AI Assistant, Content Creation, Video Optimization, AI Thumbnails, OpenAI, GPT-4, Video Transcription, Content Generator";
  const siteUrl = "https://youtube-ai-assistant.com/";
  const imageUrl =
    "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/youtube-ai-assistant-og.png";

  return [
    { title },
    {
      name: "description",
      content: description,
    },

    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: siteUrl },
    { property: "og:site_name", content: "YouTube AI Assistant" },
    { property: "og:image", content: imageUrl },

    // Twitter Card
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    {
      name: "twitter:description",
      content: description,
    },
    { name: "twitter:image", content: imageUrl },
    {
      name: "keywords",
      content: keywords,
    },
    { name: "author", content: "YouTube AI Team" },
    { name: "favicon", content: "/youtube-ai-logo.png" },
  ];
}

export async function loader(args: Route.LoaderArgs) {
  const { userId } = await getAuth(args);
  
  let initialStats = null;
  
  try {
    // Fetch initial stats from Convex
    const convexUrl = process.env.VITE_CONVEX_URL || "https://charming-bird-938.convex.cloud";
    
    // Validate URL before creating client
    if (!convexUrl || convexUrl === "https://" || !convexUrl.startsWith("https://")) {
      throw new Error("Invalid Convex URL");
    }
    
    const convex = new ConvexHttpClient(convexUrl);
    initialStats = await convex.query(api.domains.shared.stats.getHeroStats);
  } catch (error) {
    console.error("Error with Convex connection:", error);
    // Continue without stats if there's an error - this simulates Convex being down
    initialStats = null;
  }

  return {
    isSignedIn: !!userId,
    initialStats,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <HeroSection loaderData={loaderData}/>
      <Footer />
    </>
  );
}