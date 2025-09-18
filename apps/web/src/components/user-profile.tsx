import { useAuth } from "../contexts/auth-context";
import { LogOut, Github } from "lucide-react";
import { Card, CardContent } from "./ui/card";

export function UserProfile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <img
            src={user.avatar_url}
            alt={user.name || user.login}
            className="w-12 h-12 rounded-full border-2 border-gray-200"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {user.name || user.login}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              @{user.login}
            </p>
            {user.email && (
              <p className="text-xs text-gray-400 truncate">
                {user.email}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="View GitHub Profile"
            >
              <Github className="h-5 w-5" />
            </a>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LoginButton() {
  const { login, isLoading } = useAuth();

  return (
    <button
      onClick={login}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
    >
      <Github className="h-5 w-5" />
      {isLoading ? "Loading..." : "Sign in with GitHub"}
    </button>
  );
}
