import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/auth-context";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions
      if (hasProcessed) {
        return;
      }
      setHasProcessed(true);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          console.error('GitHub OAuth error from URL:', error);
          setError(`GitHub authentication failed: ${error}`);
          setStatus('error');
          return;
        }

        if (!code) {
          console.error('No authorization code in URL params');
          setError('No authorization code received from GitHub');
          setStatus('error');
          return;
        }


        // Exchange code for access token
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${apiBaseUrl}/api/auth/github`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to authenticate with GitHub');
        }

        const { access_token } = await response.json();
        
        // Store token in localStorage
        localStorage.setItem('github_token', access_token);
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('github-token-updated', { detail: access_token }));
        
        // Refresh user data in auth context
        try {
          await refreshUser();
          setStatus('success');
          
          // Redirect to main page after a short delay
          setTimeout(() => {
            navigate({ to: '/' });
          }, 300);
        } catch (refreshError) {
          console.error('Failed to refresh user data:', refreshError);
          // Even if refresh fails, we still have the token, so proceed
          setStatus('success');
          setTimeout(() => {
            navigate({ to: '/' });
          }, 300);
        }

      } catch (err) {
        console.error('Authentication error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, refreshUser, hasProcessed]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authenticating with GitHub...</h2>
          <p className="text-gray-600">Please wait while we complete your authentication.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h2 className="font-bold">Authentication Failed</h2>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => navigate({ to: '/' })}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h2 className="font-bold">Authentication Successful!</h2>
          <p className="text-sm">You have been successfully authenticated with GitHub.</p>
        </div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
}


