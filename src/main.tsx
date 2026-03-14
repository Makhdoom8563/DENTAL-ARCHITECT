import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "https://pleasant-mammoth-827.convex.cloud";
let convex: ConvexReactClient | null = null;

try {
  if (convexUrl) {
    const url = new URL(convexUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      convex = new ConvexReactClient(convexUrl);
    }
  }
} catch (e) {
  console.error("Failed to initialize Convex client. Ensure VITE_CONVEX_URL is a valid absolute URL.", e);
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

  // Only intercept relative /api/ calls
  if (token && typeof resource === 'string' && resource.startsWith('/api/')) {
    config = config || {};
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
    const absoluteUrl = new URL(resource, window.location.origin).toString();
    return originalFetch(absoluteUrl, config);
  }
  
  return originalFetch(...args);
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
      <div className="p-4 text-red-500">
        Convex URL is not configured. Please add VITE_CONVEX_URL to your settings.
      </div>
    )}
  </StrictMode>,
);
