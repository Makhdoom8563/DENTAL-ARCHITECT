import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const rawConvexUrl = import.meta.env.VITE_CONVEX_URL || "https://woozy-retriever-445.convex.cloud";
// Handle cases where the env var might be the string "undefined" or "null"
const convexUrl = (rawConvexUrl === "undefined" || rawConvexUrl === "null") 
  ? "https://woozy-retriever-445.convex.cloud" 
  : rawConvexUrl;

let convex: ConvexReactClient | null = null;

try {
  if (convexUrl) {
    const url = new URL(convexUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      convex = new ConvexReactClient(convexUrl);
    }
  }
} catch (e) {
  console.error("Failed to initialize Convex client:", e);
}

// Intercept fetch calls to add the Authorization token
const originalFetch = window.fetch;
const customFetch = async (...args: Parameters<typeof fetch>) => {
  let [resource, config] = args;
  
  const storedUser = localStorage.getItem('user');
  let token = null;
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      token = user.token;
    } catch (e) {}
  }

  if (!token) {
    const storedDoctor = localStorage.getItem('doctor_user');
    if (storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor);
        token = doctor.token;
      } catch (e) {}
    }
  }

  // Always use absolute URLs for /api/ calls to ensure consistency
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
    const absoluteUrl = new URL(resource, window.location.origin).toString();
    
    if (token) {
      config = config || {};
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
    
    return originalFetch(absoluteUrl, config);
  }
  
  return originalFetch(resource, config);
};

try {
  Object.defineProperty(window, 'fetch', {
    value: customFetch,
    writable: true,
    configurable: true
  });
} catch (e) {
  console.error('Failed to override fetch:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convex ? (
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
