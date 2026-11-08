const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");




export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
}

export function clearStoredToken() {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  auth?: boolean;
};


export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const headers = new Headers(options.headers);

  // Skip ngrok browser warning
  headers.set("ngrok-skip-browser-warning", "true");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();

  if (options.auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && options.auth !== false) {
    clearStoredToken();

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }

  const text = await response.text();

  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String((data as { message: unknown }).message)
        : `Request failed (${response.status})`;

    throw new ApiError(message, response.status);
  }

  return data as T;
}
