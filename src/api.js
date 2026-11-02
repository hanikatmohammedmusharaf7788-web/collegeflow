import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api", timeout: 20000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("campusflow-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function errorMessage(error) {
  if (error.code === "ECONNABORTED") {
    return "The request took too long. Check the server connection and try again.";
  }
  if (!error.response && error.request) {
    return "Cannot reach the API. Start MongoDB and the Express server, then try again.";
  }
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.status >= 500) {
    return `The API returned HTTP ${error.response.status}. Check the Express server terminal for the cause.`;
  }
  return error.message || "Something went wrong. Please try again.";
}

export default api;
