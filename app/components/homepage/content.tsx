import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export default function ContentSection() {
  return (
    <section id="features" className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            The Starter Kit you need to start your SaaS application.
          </h2>
          <div className="space-y-6">
            <p>
              Stop rebuilding the same foundation over and over. RSK eliminates
              months of integration work by providing a complete,
              production-ready SaaS template with authentication, payments, and
              real-time data working seamlessly out of the box.{" "}
            </p>
            <p>
              <span className="font-bold">From idea to launch in weeks,</span>{" "}
              not months. With TypeScript safety, modern UI components, and
              scalable architecture built-in, you can validate your business
              concept and start generating revenue while your competitors are
              still setting up their development environment.{" "}
            </p>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="gap-1 pr-1.5"
            >
              <Link to="#">
                <span>Learn More</span>
                <ChevronRight className="size-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
