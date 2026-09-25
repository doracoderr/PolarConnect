import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Send the httpOnly auth cookie on every request. The token itself is
  // never touched by JS anymore — no Authorization header to attach.
  withCredentials: true,
});

// If the cookie is missing/expired, the API returns 401. Clear the local
// "am I logged in" UI flag so the app doesn't keep showing admin nav links
// for a session the server no longer honors.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("pc_logged_in");
      sessionStorage.removeItem("pc_admin_name");
      sessionStorage.removeItem("pc_admin_email");
      sessionStorage.removeItem("pc_admin_role");
    }
    return Promise.reject(error);
  }
);

export default api;
