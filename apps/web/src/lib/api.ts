// API configuration utility
export const getApiBaseUrl = (): string => {
  // Priority 1: VITE_SERVER_URL (most explicit)
  let baseUrl = import.meta.env.VITE_SERVER_URL;
  
  // Priority 2: VITE_API_BASE_URL (legacy support)
  if (!baseUrl) {
    baseUrl = import.meta.env.VITE_API_BASE_URL;
  }
  
  // Priority 3: Auto-detect from current domain
  if (!baseUrl) {
    const currentHost = window.location.hostname;
    
    // Force localhost mode for development/demo
    if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes('localhost')) {
      baseUrl = 'http://localhost:3000';
    } else if (currentHost === 'reviewiq.xyz' || currentHost.includes('reviewiq.xyz')) {
      // Backend deployed at /api/ with API routes at /api/api/*
      baseUrl = 'https://reviewiq.xyz/api';
    } else {
      // Default fallback for development
      baseUrl = 'http://localhost:3000';
    }
  }
  
  console.log('🔧 API Base URL:', baseUrl);
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🔧 VITE_SERVER_URL env var:', import.meta.env.VITE_SERVER_URL);
  console.log('🔧 VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL);
  return baseUrl;
};

// Helper function for making API calls
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  console.log('📡 Making API call to:', url);
  
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
};
