// Instagram, Snapchat, Facebook, LinkedIn, TikTok and X open links in their own
// built-in browser. Google refuses to sign anyone in from there (error
// "disallowed_useragent"), so the sign-in screens tell people to open the page
// in Safari or Chrome instead. WhatsApp is fine: it hands links to the real
// browser (Safari View Controller / Chrome Custom Tabs), which Google allows.

export type InAppBrowser = "instagram" | "facebook" | "snapchat" | "linkedin" | "tiktok" | "x" | "other";

const PATTERNS: [InAppBrowser, RegExp][] = [
  ["instagram", /Instagram/i],
  ["facebook", /FBAN|FBAV|FBIOS|FB_IAB|FB4A/],
  ["snapchat", /Snapchat/i],
  ["linkedin", /LinkedInApp/i],
  ["tiktok", /musical_ly|BytedanceWebview|TikTok/i],
  ["x", /\bTwitter\b/i],
];

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  for (const [name, pattern] of PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  // Any other Android app's embedded browser marks itself with "; wv)".
  if (/; wv\)/.test(userAgent)) return "other";
  return null;
}
