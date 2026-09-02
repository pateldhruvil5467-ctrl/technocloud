// Centralized backend API base URL.
//
// Sourced from Create React App's built-in environment-variable mechanism
// (REACT_APP_* variables, loaded at build time from .env.development /
// .env.production / the hosting platform's configured environment — see
// client/.env.development and client/.env.example).
//
// Falls back to the current default so local development keeps working
// unchanged if no environment file/variable is present.
export const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
