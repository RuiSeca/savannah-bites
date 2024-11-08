// src/config/environment.js
export const ENV_CONFIG = {
  // For local development
  development: {
    API_BASE_URL: "http://localhost:5000",
  },
  // For production (Render)
  production: {
    API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  },
};
