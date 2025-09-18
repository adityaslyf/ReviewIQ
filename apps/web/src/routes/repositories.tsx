import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../contexts/auth-context";
import { RepositoriesPage } from "../components/repositories-page";

export const Route = createFileRoute("/repositories")({
  component: RepositoriesComponent,
});

const queryClient = new QueryClient();

function RepositoriesComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesContent />
    </QueryClientProvider>
  );
}

function RepositoriesContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <RepositoriesPage />;
}