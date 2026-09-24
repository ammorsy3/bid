// Unit tests for spotting in-app browsers, where Google sign-in is blocked.

import { describe, it, expect } from "vitest";
import { detectInAppBrowser } from "../client/src/lib/in-app-browser";

describe("detectInAppBrowser", () => {
  const cases: [string, string, ReturnType<typeof detectInAppBrowser>][] = [
    [
      "Instagram on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 339.0.3.12.105 (iPhone15,3; iOS 17_5; ar_SA; ar; scale=3.00; 1290x2796; 625162385)",
      "instagram",
    ],
    [
      "Snapchat on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.10.0.40 (like Safari/8617.2.4.10.8, panda)",
      "snapchat",
    ],
    [
      "Facebook on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.99;FBBV/620000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/ar_AR;FBOP/5]",
      "facebook",
    ],
    [
      "LinkedIn on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1",
      "linkedin",
    ],
    [
      "TikTok on Android",
      "Mozilla/5.0 (Linux; Android 14; SM-S921B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 musical_ly_2023508030 JsSdk/1.0 NetType/WIFI",
      "tiktok",
    ],
    [
      "X on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone/10.50",
      "x",
    ],
    [
      "another Android app's web view",
      "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36",
      "other",
    ],
    [
      "Safari on iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      null,
    ],
    [
      "Chrome on Android",
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
      null,
    ],
    [
      "Samsung Internet",
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36",
      null,
    ],
  ];

  it.each(cases)("%s", (_label, userAgent, expected) => {
    expect(detectInAppBrowser(userAgent)).toBe(expected);
  });
});
