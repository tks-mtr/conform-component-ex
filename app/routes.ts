import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("assign", "routes/assign.tsx"),
  route("users", "routes/user-list.tsx"),
  route("register-complete", "routes/register-complete.tsx"),
  route("api/department", "routes/api.department.ts"),
  route("resources/user-list-pdf", "routes/resources.user-list-pdf.ts"),
] satisfies RouteConfig;
