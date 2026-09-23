/**
 * Single source of truth for the backend origin.
 *
 * In development the API runs on the same machine on port 5000, so falling back
 * to `window.location.hostname` works. In production the frontend (cPanel) and
 * the API (Render) live on different hosts — and a hard-coded `http://` URL is
 * additionally blocked as mixed content on an HTTPS page — so `VITE_API_URL`
 * must be set at build time.
 */
const resolveApiBase = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const { protocol, hostname } = window.location;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname);

  if (isLocal) return `${protocol}//${hostname}:5000`;

  if (import.meta.env.PROD) {
    console.error(
      '[api] VITE_API_URL is not set. Build with VITE_API_URL=https://your-app.onrender.com '
      + 'or all API requests will fail.'
    );
  }

  // Last resort: same origin, assuming a reverse proxy fronts the API.
  return window.location.origin;
};

export const API_BASE = resolveApiBase();

export const apiUrl = (path) => `${API_BASE}${path}`;

/**
 * Extract a useful message from a backend error response.
 * The API returns `{ error, code, hint }`; older/edge responses may not.
 */
export const readApiError = async (response, fallback) => {
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* non-JSON body */
  }
  return {
    message: (body && body.error) || fallback,
    code: (body && body.code) || `HTTP_${response.status}`,
    hint: (body && body.hint) || '',
  };
};
