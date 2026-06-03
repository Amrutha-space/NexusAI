export function getBaseHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    ...extra
  };
}

export async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return { message: await response.text() };
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
