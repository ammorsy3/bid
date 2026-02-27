const ERROR_ENDPOINT = "/api/errors";
let lastErrorTime = 0;
const MIN_INTERVAL = 1000;

export function reportError({
  message,
  stack,
  path,
  statusCode,
  method,
  metadata,
}: {
  message: string;
  stack?: string;
  path?: string;
  statusCode?: number;
  method?: string;
  metadata?: Record<string, any>;
}) {
  const now = Date.now();
  if (now - lastErrorTime < MIN_INTERVAL) return;
  lastErrorTime = now;

  const token = localStorage.getItem("token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  fetch(ERROR_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      stack,
      path: path || window.location.pathname,
      statusCode,
      method,
      metadata,
    }),
  }).catch(() => {});
}

export function setupGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    reportError({
      message: event.message || "Uncaught error",
      stack: event.error?.stack,
      path: window.location.pathname,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportError({
      message: reason?.message || String(reason) || "Unhandled promise rejection",
      stack: reason?.stack,
      path: window.location.pathname,
    });
  });
}
