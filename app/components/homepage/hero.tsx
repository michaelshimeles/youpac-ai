import { memo } from "react";
import { Link } from "react-router";
import { LogoIcon } from "~/components/logo";
import {
  Convex,
  OpenAI,
  ReactIcon,
  YouTube,
  TailwindIcon,
  Typescript,
  ClerkIcon,
} from "~/components/logos";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Navbar } from "./navbar";
import { ArrowRight, Sparkles, Video, Palette, Share2, Bot } from "lucide-react";

export default function Hero({
  loaderData,
}: {
  loaderData?: { isSignedIn: boolean };
}) {
  return (
    <section id="hero" className="relative overflow-hidden">
      <Navbar loaderData={loaderData} />
      
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 dark:from-primary/10 dark:to-primary/5">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      </div>
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-blue-500/30 to-primary/30 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>
      
      <div className="relative py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 mb-8">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Content Creation</span>
            </div>
            
            {/* Main heading with gradient */}
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
              <span className="block">Package Your</span>
              <span className="block bg-gradient-to-r from-blue-500 via-primary to-cyan-500 bg-clip-text text-transparent">
                YouTube Content
              </span>
              <span className="block">Better With AI</span>
            </h1>
            
            {/* Description */}
            <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Generate compelling titles, descriptions, stunning thumbnails, and viral social media posts. 
              All powered by cutting-edge AI, designed for YouTube creators.
            </p>
            
            {/* CTA Buttons */}
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Button size="lg" className="group" asChild>
                <Link
                  to={
                    loaderData?.isSignedIn
                      ? "/dashboard"
                      : "/sign-up"
                  }
                  prefetch="viewport"
                >
                  {loaderData?.isSignedIn
                    ? "Go to Dashboard"
                    : "Start Creating for Free"}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link
                  to="https://github.com/youtube-ai-assistant"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Star on GitHub
                </Link>
              </Button>
            </div>
            
            {/* Feature highlights */}
            <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-3xl mx-auto">
              <FeatureCard icon={Video} title="Smart Titles" />
              <FeatureCard icon={Palette} title="AI Thumbnails" />
              <FeatureCard icon={Bot} title="SEO Descriptions" />
              <FeatureCard icon={Share2} title="Social Posts" />
            </div>
            
            {/* Tech stack */}
            <div className="mt-20">
              <p className="text-sm font-medium text-muted-foreground mb-8">Built with cutting-edge technology</p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <YouTube />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <OpenAI />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <Convex />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <ReactIcon />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <TailwindIcon />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <Typescript />
                </IntegrationCard>
                <IntegrationCard className="hover:scale-110 transition-transform">
                  <ClerkIcon />
                </IntegrationCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Feature card component
const FeatureCard = ({ icon: Icon, title }: { icon: any; title: string }) => {
  return (
    <div className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <Icon className="h-8 w-8 text-primary mb-3 mx-auto" />
      <p className="text-sm font-medium">{title}</p>
    </div>
  );
};

const IntegrationCard = memo(({
  children,
  className,
  borderClassName,
}: {
  children: React.ReactNode;
  className?: string;
  borderClassName?: string;
}) => {
  return (
    <div
      className={cn(
        "bg-card/50 backdrop-blur-sm relative flex size-16 rounded-xl shadow-sm",
        className
      )}
    >
      <div
        role="presentation"
        className={cn(
          "absolute inset-0 rounded-xl border border-border/50",
          borderClassName
        )}
      />
      <div className="relative z-20 m-auto size-fit *:size-7">{children}</div>
    </div>
  );
});
