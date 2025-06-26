import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { ClerkProvider, useAuth } from "@clerk/react-router";
import { rootAuthLoader } from "@clerk/react-router/ssr.server";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { Route } from "./+types/root";
import "./app.css";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";

// Validate and create Convex client with proper error handling
const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL environment variable is not set. Please check your .env.local file.");
}

let convex: ConvexReactClient;
try {
  convex = new ConvexReactClient(convexUrl);
} catch (error) {
  throw new Error(`Invalid VITE_CONVEX_URL: ${convexUrl}. Please ensure it's a valid absolute URL (e.g., https://your-deployment.convex.cloud)`);
}

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args);
}
export const links: Route.LinksFunction = () => [
  // DNS prefetch for external services
  { rel: "dns-prefetch", href: "https://fonts.googleapis.com" },
  { rel: "dns-prefetch", href: "https://fonts.gstatic.com" },
  { rel: "dns-prefetch", href: "https://api.convex.dev" },
  { rel: "dns-prefetch", href: "https://clerk.dev" },
  
  // Preconnect to font services
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  
  // Font with display=swap for performance
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  
  // Preload critical assets
  {
    rel: "preload",
    href: "/ypai.png",
    as: "image",
    type: "image/png",
  },
  
  // Icon
  {
    rel: "icon",
    type: "image/png",
    href: "/ypai.png",
  },
];

export const meta: Route.MetaFunction = () => [
  { title: "YouPac AI - YouTube Content Creation Assistant" },
  { name: "description", content: "AI-powered YouTube content creation, video ideas, and channel optimization tools." },
  
  // Open Graph
  { property: "og:title", content: "YouPac AI - YouTube Content Creation Assistant" },
  { property: "og:description", content: "AI-powered YouTube content creation, video ideas, and channel optimization tools." },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://youpac-ai.vercel.app" },
  { property: "og:image", content: "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/youtube-ai-assistant-og.png" },
  
  // Twitter Card
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: "YouPac AI - YouTube Content Creation Assistant" },
  { name: "twitter:description", content: "AI-powered YouTube content creation, video ideas, and channel optimization tools." },
  { name: "twitter:image", content: "https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/youtube-ai-assistant-og.png" },
  
  // Additional SEO
  { name: "viewport", content: "width=device-width, initial-scale=1" },
  { name: "theme-color", content: "#000000" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <ClerkProvider
      loaderData={loaderData}
      signUpFallbackRedirectUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <Outlet />
        <Toaster position="bottom-right" />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}