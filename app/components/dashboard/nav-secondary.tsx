"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { Link, useLocation } from "react-router"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: Icon
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const location = useLocation();

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.pathname === item.url ||
                           (item.url.startsWith("/dashboard") && location.pathname.startsWith(item.url));
            const isImplemented = item.url !== "#";
            
            return (
              <SidebarMenuItem key={item.title}>
                {isImplemented ? (
                  <SidebarMenuButton isActive={isActive} asChild>
                    <Link to={item.url} prefetch="intent">
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton disabled>
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
