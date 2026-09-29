import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/landing-page";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "ReviewIQ — Give your code a second look" },
      {
        name: "description",
        content:
          "Catch bugs, understand the risk, and review concrete fixes. ReviewIQ brings context-aware AI code review to your GitHub pull requests.",
      },
    ],
  }),
});
