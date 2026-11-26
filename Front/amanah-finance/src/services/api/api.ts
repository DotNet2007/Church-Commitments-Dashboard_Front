
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function getStoredToken(): string | null {
  return (
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken")
  );
}

export function clearStoredToken(): void {
  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("accessToken");
}

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
  /** Override the API origin for modules mounted on a different backend base path. */
  baseUrl?: string;
  auth?: boolean;
  redirectOnUnauthorized?: boolean;
};

function getErrorMessage(data: unknown, status: number): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data
  ) {
    const message = (data as { message: unknown }).message;

    if (Array.isArray(message)) {
      return message.map(String).join(", ");
    }

    if (message !== undefined && message !== null) {
      return String(message);
    }
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return `Request failed (${status})`;
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const {
    auth,
    baseUrl = API_BASE_URL,
    redirectOnUnauthorized = true,
    ...fetchOptions
  } = options;

  const headers = new Headers(fetchOptions.headers);

  headers.set("ngrok-skip-browser-warning", "true");

  if (fetchOptions.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();

  if (auth !== false && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error
        ? error.message
        : "Unable to connect to the server.",
      0
    );
  }

  const data = await parseResponse(response);

  if (response.status === 401 && auth !== false) {
    clearStoredToken();

    if (
      redirectOnUnauthorized &&
      window.location.pathname !== "/login"
    ) {
      window.location.replace("/login");
    }
  }

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(data, response.status),
      response.status,
      data
    );
  }

  return data as T;
}
