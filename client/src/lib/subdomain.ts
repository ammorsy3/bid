export function isMarketplaceSubdomain(): boolean {
  const hostname = window.location.hostname;
  return hostname.startsWith('marketplace.');
}
