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

