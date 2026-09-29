import Header from "@/components/header";
import Loader from "@/components/loader";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "ReviewIQ",
      },
      {
        name: "description",
        content: "ReviewIQ is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/reviewiq.svg",
      },
    ],
  }),
});

function RootComponent() {
  const isLanding = useRouterState({
    select: (s) => s.location.pathname === "/",
  });
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });

  return (
    <>
      <HeadContent />
      <AuthProvider>
        <div className="h-svh">
          {!isLanding && <Header />}
          <div className={isLanding ? "" : "pt-24"}>
            {isFetching ? <Loader /> : <Outlet />}
          </div>
        </div>
        <Toaster richColors />
      </AuthProvider>
      {!isLanding && <TanStackRouterDevtools position="bottom-left" />}
    </>
  );
}
