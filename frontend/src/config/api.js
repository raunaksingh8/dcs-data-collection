/**
 * Central API configuration
 * 
 * Automatically resolves the base URL based on environment:
 * - Local Development: uses REACT_APP_API_URL from .env.development (http://localhost:8000)
 * - Production: uses REACT_APP_API_URL from .env.production (https://price-watcher-backend-6470.onrender.com)
 */

const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    (process.env.NODE_ENV === "production"
        ? "https://price-watcher-backend-6470.onrender.com"
        : "http://localhost:8000");

export default API_BASE_URL;
