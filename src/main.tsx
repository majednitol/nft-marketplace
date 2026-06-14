import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { validateSecurityConfig } from './config/security';

// Validate security configuration before starting the app
if (!validateSecurityConfig()) {
  console.error('Security configuration validation failed. App may not function correctly.');
}

// Initialize security measures
if (import.meta.env.PROD) {
  // Disable console.log in production for security
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  // Keep console.error for critical issues
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
