import { IconDashboard, IconSettings } from "@tabler/icons-react";
import { MessageCircle, Twitter, Youtube, HelpCircle } from "lucide-react";
import { Link, useOutletContext } from "react-router"; // Import useOutletContext
import type { UserResource } from "@clerk/types";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarGroupLabel,
} from "~/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Projects",
      url: "/dashboard",
      icon: IconDashboard,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar({
  variant,
  user,
}: {
  variant: "sidebar" | "floating" | "inset";
  user: UserResource | null | undefined;
}) {
  // Use context to get setTourStep, removing it from props
  const context = useOutletContext<{ setTourStep?: (step: number) => void }>();
  const setTourStep = context?.setTourStep;

  const handleStartTour = () => {
    if (setTourStep) {
      setTourStep(1);
    } else {
      console.error("setTourStep from context is not available in AppSidebar");
      // Optionally, provide user feedback here, e.g., a toast message
    }
  };

  return (
    <Sidebar collapsible="offcanvas" variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link to="/" prefetch="viewport">
              <span className="text-base font-semibold">YouPac AI</span>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        
        {/* Social Links */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Connect</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a 
                    href="https://x.com/rasmickyy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>@rasmickyy</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a 
                    href="https://youtube.com/@rasmic" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Youtube className="h-4 w-4" />
                    <span>@rasmic</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Onboarding Tour Button */}
        <SidebarGroup className="mt-2">
          <SidebarGroupLabel>Help</SidebarGroupLabel> {/* Added Group Label */}
            <SidebarGroupContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleStartTour}
                            role="button"
                            aria-label="Start onboarding tour"
                            tabIndex={0} // Ensure focusable
                            onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === ' ') {
                                 e.preventDefault();
                                 handleStartTour();
                               }
                            }}
                            disabled={!setTourStep} // Optionally disable if context not ready
                        >
                            <HelpCircle className="h-4 w-4" />
                            <span>Start Tour</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
        
        <NavSecondary items={data.navSecondary} className="mt-2" />
      </SidebarContent>
      <SidebarFooter>{user && <NavUser user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
