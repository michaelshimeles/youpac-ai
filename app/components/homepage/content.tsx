import { Button } from "~/components/ui/button";
import { 
  ChevronRight, 
  Palette, 
  MessageSquare, 
  Sparkles,
  Video,
  FileText,
  Share2,
  Zap,
  Eye,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";

export default function ContentSection() {
  return (
    <>
      <section id="features" className="relative py-24 md:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        
        {/* Animated gradient orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/20 to-primary/20 blur-3xl animate-pulse" />
        
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20">
                <Zap className="h-4 w-4" />
                <span>Supercharge Your Workflow</span>
              </div>
              
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                AI-Powered Content Creation for{" "}
                <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                  YouTube Creators
                </span>
              </h2>
              
              <div className="space-y-6 text-lg text-muted-foreground">
                <p>
                  Transform your video content workflow with our intelligent AI assistant.
                  Upload your video and watch as our advanced AI generates optimized
                  titles, compelling descriptions, eye-catching thumbnail concepts,
                  and engaging social media posts - all tailored to your channel's unique voice.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Save hours on every video</span>{" "}
                  with automatic transcription, visual canvas for organizing content,
                  and AI agents that understand your niche and audience. Perfect for
                  creators who want to focus on making great videos while AI handles
                  the optimization.
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="group"
                >
                  <Link to="/sign-up">
                    <span>Start Creating</span>
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                >
                  <Link to="#demo">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>Watch Demo</span>
                  </Link>
                </Button>
              </div>
            </div>
            
            {/* Visual representation */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-4">
                <FeaturePreviewCard
                  icon={Video}
                  title="Video Analysis"
                  description="AI understands your content"
                  className="translate-y-4"
                />
                <FeaturePreviewCard
                  icon={FileText}
                  title="Smart Titles"
                  description="SEO-optimized suggestions"
                  className="-translate-y-4"
                />
                <FeaturePreviewCard
                  icon={Palette}
                  title="Thumbnails"
                  description="Eye-catching designs"
                  className="translate-y-4"
                />
                <FeaturePreviewCard
                  icon={Share2}
                  title="Social Posts"
                  description="Viral-ready content"
                  className="-translate-y-4"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="relative py-24 md:py-32 bg-muted/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 mb-6">
              <Sparkles className="h-4 w-4" />
              <span>Powerful Features</span>
            </div>
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                Create Better Content
              </span>
            </h3>
            <p className="mt-4 text-lg text-muted-foreground">
              Our comprehensive suite of AI tools helps you optimize every aspect of your YouTube content
            </p>
          </div>
          
          {/* Feature grid */}
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={Palette}
              title="Visual Canvas"
              description="Drag-and-drop interface to organize your content creation workflow. Connect video nodes to AI agents and visualize your entire process."
              gradient="from-blue-500/10 to-cyan-500/10"
            />
            
            <FeatureCard
              icon={Sparkles}
              title="Smart AI Agents"
              description="Specialized agents for titles, descriptions, thumbnails, and social posts. Each agent understands your content and channel style."
              gradient="from-primary/10 to-purple-500/10"
            />
            
            <FeatureCard
              icon={MessageSquare}
              title="Interactive Chat"
              description="Chat with AI agents to refine content. Use @mentions to direct questions and get instant suggestions for improvements."
              gradient="from-purple-500/10 to-pink-500/10"
            />
          </div>
          
          {/* Stats section */}
          <div className="mt-20 grid grid-cols-2 gap-8 border-t border-border/50 pt-12 sm:grid-cols-4">
            <StatCard number="10x" label="Faster Content Creation" />
            <StatCard number="50%" label="More Engagement" />
            <StatCard number="100+" label="AI Models Available" />
            <StatCard number="24/7" label="Support Available" />
          </div>
        </div>
      </section>
    </>
  );
}

// Feature preview card for the hero section visual
const FeaturePreviewCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  className?: string;
}) => {
  return (
    <div className={cn(
      "group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/10",
      className
    )}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="relative h-8 w-8 text-primary mb-3" />
      <h4 className="relative text-sm font-semibold mb-1">{title}</h4>
      <p className="relative text-xs text-muted-foreground">{description}</p>
    </div>
  );
};

// Feature card for the features section
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  gradient 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  gradient: string;
}) => {
  return (
    <div className="group relative">
      <div className={cn(
        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-all duration-300 blur-xl",
        gradient
      )} />
      <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 hover:border-primary/50 transition-all hover:shadow-lg">
        <div className={cn(
          "inline-flex rounded-xl bg-gradient-to-br p-3 mb-5",
          gradient
        )}>
          <Icon className="h-6 w-6 text-foreground" />
        </div>
        <h4 className="text-xl font-semibold mb-3">{title}</h4>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

// Stat card component
const StatCard = ({ number, label }: { number: string; label: string }) => {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
        {number}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
};
