function readApiOrigin(): string {
  const configuredValue = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!configuredValue) {
    throw new Error("VITE_API_BASE_URL is not configured");
  }

  const url = new URL(configuredValue);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS");
  }
  if (
    (url.pathname !== "/" && url.pathname !== "")
    || url.search
    || url.hash
  ) {
    throw new Error("VITE_API_BASE_URL must be an origin without a path");
  }

  return url.origin;
}

export const API_ORIGIN = readApiOrigin();
export const API_PREFIX = "/api/v1";
export const API_BASE_URL = `${API_ORIGIN}${API_PREFIX}`;
