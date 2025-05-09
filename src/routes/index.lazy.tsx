import { createLazyRoute } from "@tanstack/react-router";

function Index() {
  return "";
}

export const Route = createLazyRoute("/")({
  component: Index,
});
