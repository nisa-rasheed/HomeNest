
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

const refreshClient = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

// Attach the current tab's access token
axiosInstance.interceptors.request.use(
  (config) => {
    if (!config.skipAuth) {
      const token = sessionStorage.getItem("access_token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically refresh expired access token
axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;

    const isTokenExpired =
      (status === 401 || status === 400) &&
      errorCode === "token_not_valid";

    if (
      isTokenExpired &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuth
    ) {
      originalRequest._retry = true;

      const refreshToken = sessionStorage.getItem("refresh_token");

      if (!refreshToken) {
        sessionStorage.removeItem("access_token");
        return Promise.reject(error);
      }

      try {
        const response = await refreshClient.post(
          "/token/refresh/",
          {
            refresh: refreshToken,
          }
        );

        const newAccessToken = response.data.access;

        sessionStorage.setItem("access_token", newAccessToken);

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
