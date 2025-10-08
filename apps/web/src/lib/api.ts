// API configuration utility
export const getApiBaseUrl = (): string => {
  // Priority 1: VITE_SERVER_URL (most explicit)
  let baseUrl = import.meta.env.VITE_SERVER_URL;
  
  // Priority 2: VITE_API_BASE_URL (legacy support)
  if (!baseUrl) {
    baseUrl = import.meta.env.VITE_API_BASE_URL;
  }
  
  // Priority 3: Auto-detect from current domain (secure fallback)
  if (!baseUrl) {
    const currentHost = window.location.hostname;
    
    // Development mode
    if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes('localhost')) {
      baseUrl = 'http://localhost:3000';
    } else {
      // Production mode - use environment variable only
      baseUrl = import.meta.env.VITE_SERVER_URL || '';
    }
  }
  
  return baseUrl;
};

// Helper function for making API calls
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiBaseUrl();
  // Ensure proper URL construction by removing trailing slash from baseUrl and leading slash from endpoint if both exist
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${cleanBaseUrl}${cleanEndpoint}`;
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
};
