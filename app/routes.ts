import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("features/homepage/routes/home.tsx"),
  route("sign-in/*", "features/auth/routes/sign-in.tsx"),
  route("sign-up/*", "features/auth/routes/sign-up.tsx"),
  route("share/:shareId", "features/sharing/routes/share.$shareId.tsx"),
  layout("features/dashboard/routes/layout.tsx", [
    route("dashboard", "features/dashboard/routes/index.tsx"),
    route("dashboard/project/:projectId", "features/canvas/routes/project.$projectId.tsx"),
    route("dashboard/chat", "features/ai/routes/chat.tsx"),
    route("dashboard/settings", "features/settings/routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
