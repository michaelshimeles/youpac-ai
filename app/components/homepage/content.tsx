import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export default function ContentSection() {
  return (
    <>
      <section id="features" className="py-16 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-6 md:grid-cols-2 md:gap-12">
            <h2 className="text-4xl font-medium">
              AI-Powered Content Creation for YouTube Creators
            </h2>
            <div className="space-y-6">
              <p>
                Transform your video content workflow with our intelligent AI assistant.
                Upload your video and watch as our advanced AI generates optimized
                titles, compelling descriptions, eye-catching thumbnail concepts,
                and engaging social media posts - all tailored to your channel's unique voice.
              </p>
              <p>
                <span className="font-bold">Save hours on every video</span>{" "}
                with automatic transcription, visual canvas for organizing content,
                and AI agents that understand your niche and audience. Perfect for
                creators who want to focus on making great videos while AI handles
                the optimization.
              </p>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="gap-1 pr-1.5"
              >
                <Link to="/sign-up">
                  <span>Start Creating</span>
                  <ChevronRight className="size-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 md:py-24 bg-muted/50">
        <div className="mx-auto max-w-5xl px-6">
          <h3 className="text-3xl font-semibold text-center mb-12">Key Features</h3>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a6 6 0 00-12 0v4a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold">Visual Canvas</h4>
              <p className="text-muted-foreground">
                Drag-and-drop interface to organize your content creation workflow.
                Connect video nodes to AI agents and visualize your entire process.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold">Smart AI Agents</h4>
              <p className="text-muted-foreground">
                Specialized agents for titles, descriptions, thumbnails, and social posts.
                Each agent understands your content and channel style.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold">Interactive Chat</h4>
              <p className="text-muted-foreground">
                Chat with AI agents to refine content. Use @mentions to direct
                questions and get instant suggestions for improvements.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
