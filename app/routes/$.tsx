import type { LoaderFunctionArgs } from "react-router";

// Catch-all route for unmatched paths
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  // Handle Chrome DevTools JSON file request
  if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
    return new Response("{}", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  
  // For other unmatched routes, throw 404
  throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
  // This component won't be rendered for the loader responses above
  return null;
}