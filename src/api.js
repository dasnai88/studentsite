const API_BASE = import.meta.env.VITE_API_URL || "";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Ошибка запроса.");
  }
  return data;
}
