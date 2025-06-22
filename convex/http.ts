import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

export const chat = httpAction(async (ctx, req) => {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    async onFinish({ text }) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
      console.log(text);
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      Vary: "origin",
    },
  });
});

const http = httpRouter();

http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/api/auth/webhook",
  method: "POST",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});


// Transcription proxy endpoint
http.route({
  path: "/api/transcribe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ElevenLabs API key not configured" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    
    try {
      // Get the form data from the request
      const formData = await request.formData();
      
      // Log file details
      const file = formData.get("file") as File;
      if (file) {
        console.log("📎 Transcription request:", {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
        });
        
        // Check file size before processing
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB
        if (file.size > MAX_SIZE) {
          return new Response(JSON.stringify({ 
            error: "File size exceeds 20MB limit. Please use a smaller file or compress the audio.",
            details: {
              fileSize: file.size,
              maxSize: MAX_SIZE,
              fileSizeMB: (file.size / 1024 / 1024).toFixed(2),
              maxSizeMB: 20
            }
          }), {
            status: 413, // Payload Too Large
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }
      
      // Forward the request to ElevenLabs
      const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: {
          "Xi-Api-Key": apiKey,
        },
        body: formData,
      });
      
      // Get the response data
      const responseData = await response.text();
      
      // Log response for debugging
      if (!response.ok) {
        console.error("❌ ElevenLabs error:", {
          status: response.status,
          statusText: response.statusText,
          response: responseData,
        });
      } else {
        console.log("✅ ElevenLabs transcription successful");
        // Parse and check if it's the "no speech" response
        try {
          const result = JSON.parse(responseData);
          if (result.text === "" || result.text === "We couldn't transcribe the audio. The video might be silent or in an unsupported language.") {
            console.warn("⚠️ No speech detected in the file");
          }
        } catch (e) {
          // Not JSON, that's okay
        }
      }
      
      // Return the response with CORS headers
      return new Response(responseData, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error: any) {
      console.error("Transcription proxy error:", error);
      return new Response(JSON.stringify({ error: "Failed to process transcription request" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }),
});

// OPTIONS handler for transcription endpoint
http.route({
  path: "/api/transcribe",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
