// Renders an HTTP method as a colored pill. Used inside markdown <td> cells
// when the cell content is exactly one of GET/POST/PATCH/PUT/DELETE so that
// endpoint tables get auto-upgraded without changing the source markdown.
const METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

export function isHttpMethod(value: string): boolean {
  return METHODS.has(value.trim().toUpperCase());
}

export function MethodBadge({ method }: { method: string }) {
  const m = method.trim().toUpperCase();
  return <span className="docs-method-badge" data-method={m}>{m}</span>;
}
