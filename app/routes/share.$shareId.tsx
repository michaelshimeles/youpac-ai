import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { SharedCanvas } from "~/components/canvas/SharedCanvas";

export async function loader({ params }: LoaderFunctionArgs) {
  const shareId = params.shareId;
  
  console.log("Loading share page with ID:", shareId);
  
  if (!shareId) {
    throw new Response("Share ID not found", { status: 404 });
  }

  // Hardcode the Convex URL for now
  const convexUrl = "https://charming-bird-938.convex.cloud";
  
  const convex = new ConvexHttpClient(convexUrl);
  
  try {
    const sharedData = await convex.query(api.shares.getSharedCanvas, { shareId });
    
    if (!sharedData) {
      throw new Response("Shared canvas not found", { status: 404 });
    }
    
    return { sharedData, shareId };
  } catch (error) {
    console.error("Error loading shared canvas:", error);
    throw new Response("Failed to load shared canvas", { status: 500 });
  }
}

export default function SharedCanvasPage() {
  const { sharedData, shareId } = useLoaderData<typeof loader>();
  const incrementViewCount = useMutation(api.shares.incrementViewCount);
  
  // Increment view count on mount
  useEffect(() => {
    if (shareId) {
      incrementViewCount({ shareId }).catch(console.error);
    }
  }, [shareId, incrementViewCount]);
  
  if (!sharedData) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Share not found</h1>
          <p className="text-muted-foreground">This shared canvas could not be found.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen bg-background">
      <SharedCanvas data={sharedData} />
    </div>
  );
}