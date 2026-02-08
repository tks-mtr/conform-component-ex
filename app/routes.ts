import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("register-complete", "routes/register-complete.tsx"),
  route("api/department", "routes/api.department.ts"),
] satisfies RouteConfig;
