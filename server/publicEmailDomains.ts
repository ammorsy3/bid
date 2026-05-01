// A pragmatic list of consumer / public-mailbox domains. We never use these for
// domain-based workspace discovery — otherwise a `@gmail.com` signup would
// surface every workspace that happens to have a gmail member, which is both
// noisy and a privacy leak.
//
// Not exhaustive — covers the heavy hitters and the regions Bid serves first.
// Easy to extend if we see false-positive matches in production.

const PUBLIC_EMAIL_DOMAINS = new Set<string>([
  // Google
  "gmail.com",
  "googlemail.com",

  // Microsoft
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.de",
  "outlook.com",
  "outlook.co.uk",
  "outlook.fr",
  "live.com",
  "live.co.uk",
  "msn.com",

  // Yahoo
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.de",
  "ymail.com",
  "rocketmail.com",

  // Apple
  "icloud.com",
  "me.com",
  "mac.com",

  // Other large consumer providers
  "aol.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "gmx.com",
  "gmx.de",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
  "fastmail.com",
  "tutanota.com",

  // Asia
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "naver.com",
  "daum.net",

  // MENA region public providers (Bid's primary market)
  "maktoob.com",
]);

export function getEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

export function isPublicEmailDomain(emailOrDomain: string): boolean {
  const domain = emailOrDomain.includes("@") ? getEmailDomain(emailOrDomain) : emailOrDomain.trim().toLowerCase();
  if (!domain) return true; // be conservative — treat unparseable as public
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}
