import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export const http = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 1. Request Interceptor: Tự động gắn Token
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token từ localStorage hoặc Cookie
    // Lưu ý: Nếu dùng Server Component gọi API thì cách lấy token sẽ khác
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Response Interceptor: Xử lý lỗi & Refresh Token
http.interceptors.response.use(
  (response) => response.data, // Trả về data trực tiếp, bỏ qua wrapper của axios
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Xử lý 401 Unauthorized (Token hết hạn)
    if (error.response?.status === 401 && originalRequest) {
      // Logic gọi API refresh token ở đây
      // Nếu refresh thành công -> gọi lại originalRequest
      // Nếu thất bại -> Redirect về trang login
      // window.location.href = '/login';
      return Promise.reject(error);
    }

    // Xử lý lỗi chung (hiển thị Toast message)
    // if (typeof window !== "undefined") {
    //   const msg = (error.response?.data as Record<string, string>)?.message || "Có lỗi xảy ra";
    //   message.error(msg);
    // }

    return Promise.reject(error);
  },
);
