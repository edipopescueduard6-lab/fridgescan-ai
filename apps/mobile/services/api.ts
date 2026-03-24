const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

interface ApiError {
  message: string;
  status: number;
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

const buildUrl = (endpoint: string, params?: Record<string, string>): string => {
  const url = `${API_BASE_URL}${endpoint}`;
  if (!params) return url;
  const searchParams = new URLSearchParams(params);
  return `${url}?${searchParams.toString()}`;
};

const getHeaders = (customHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...customHeaders,
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorBody = await response.text();
    let message = "A apărut o eroare neașteptată";
    try {
      const parsed = JSON.parse(errorBody);
      message = parsed.message || parsed.error || message;
    } catch {
      message = errorBody || message;
    }
    const error: ApiError = { message, status: response.status };
    throw error;
  }
  if (response.status === 204) return {} as T;
  return response.json();
};

export const api = {
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(options?.headers),
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    const response = await fetch(url, {
      method: "PUT",
      headers: getHeaders(options?.headers),
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    const response = await fetch(url, {
      method: "DELETE",
      headers: getHeaders(options?.headers),
    });
    return handleResponse<T>(response);
  },

  async upload<T>(endpoint: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const url = buildUrl(endpoint, options?.params);
    const headers: Record<string, string> = { ...options?.headers };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse<T>(response);
  },
};

export default api;
