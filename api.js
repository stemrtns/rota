const API_BASE_URL = "http://localhost:3000";

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      `Não foi possível conectar à API (${API_BASE_URL}). Inicie o projeto com npm start. ${error.message}`,
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.message || body.error || "";
    } catch {
      detail = response.statusText;
    }
    throw new Error(`A API respondeu com erro (${response.status}). ${detail}`.trim());
  }

  if (response.status === 204) return null;
  return response.json();
}

function jsonBody(value) {
  return JSON.stringify(value);
}

export const api = {
  get(path) {
    return request(path);
  },
  post(path, value) {
    return request(path, { method: "POST", body: jsonBody(value) });
  },
  patch(path, value) {
    return request(path, { method: "PATCH", body: jsonBody(value) });
  },
  delete(path) {
    return request(path, { method: "DELETE" });
  },
};
