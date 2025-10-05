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
  
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('🔧 API Base URL:', baseUrl);
    console.log('🌐 Current hostname:', window.location.hostname);
  }
  
  return baseUrl;
};

// Helper function for making API calls
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('📡 Making API call to:', url);
  }
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
};
