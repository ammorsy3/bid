// In-page checklist for the mobile + Arabic audit. Loaded before the app's own
// scripts (Playwright MCP `initScript`, or `context.addInitScript` in the
// capture spec) and exposed as `window.__mobileAudit`.
//
//   await __mobileAudit.ready({ lang })   wait for fonts, direction, spinners
//   __mobileAudit.run({ lang })           → { fails, warns, issues[], text }
//   __mobileAudit.keyboardCheck()         run with a 400px-tall viewport
//   await __mobileAudit.useState(id, lang)  load a states.json recipe (MCP use)
//
// FAIL rules (must be zero on phones):
//   overflow            something sticks out past the screen edge
//   text-clipped        text cut off inside its box
//   text-spills         text runs outside its box
//   covered             a control is covered by something else (e.g. an icon)
//   icon-over-text      an icon inside a field sits on top of the typing area
//   small-form-text     field text under 16px (iPhone zooms in and stays zoomed)
//   tap-target          control smaller than 24px with another control too close
//   email-field         email box without type/autocapitalize/autocomplete/spellcheck
//   otp-field           code boxes without one-time-code / numeric keyboard
//   html-dir            <html dir/lang> doesn't match the language
//   ltr-field           email/password/phone/code box not left-to-right on an Arabic page
//   arabic-spacing      letter-spacing on Arabic text (breaks the joined letters)
//   arabic-left         Arabic text forced to align left
//   raw-key             a translation key like "auth.email" is showing
//   page-health         empty page, error overlay, or console errors
//   dialog-open         a popup is open that the screen state didn't ask for
//   keyboard-reach      with the keyboard open, a field or the submit button can't be reached
// WARN rules: tap-target (24–43px or well spaced), latin-words, arabic-font,
//   unflipped-icon, close-side, inner-scroll, safe-area, contrast,
//   password-autocomplete.
// Escape hatch: data-audit-ok="rule another-rule" (or "all") on an element or
// ancestor skips those rules for it; data-user-content skips latin-words.
(() => {
  if (window.__mobileAudit) return;

  const consoleErrors = [];
  const IGNORED_ERRORS = [/Download the React DevTools/i, /development keys/i, /\[vite\]/i];
  const rememberError = (msg) => {
    const text = String(msg).slice(0, 300);
    if (!IGNORED_ERRORS.some((re) => re.test(text)) && !consoleErrors.includes(text)) consoleErrors.push(text);
  };
  const originalError = console.error;
  console.error = function (...args) {
    try {
      rememberError(args.map((a) => (a && a.message) || (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    } catch {}
    return originalError.apply(this, args);
  };
  window.addEventListener("error", (e) => rememberError(`page error: ${e.message}`));
  window.addEventListener("unhandledrejection", (e) => rememberError(`unhandled promise: ${(e.reason && e.reason.message) || e.reason}`));

  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const I18N_KEY = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9_]+)+$/;
  const TLDS = new Set(["com", "sa", "net", "org", "io", "ai", "dev", "app", "co", "pdf", "png", "jpg", "svg"]);
  const ALLOWED_LATIN = [
    /[\w.+-]+@[\w.-]+/g, // emails
    /https?:\/\/\S+/g,
    /\b[\w-]+\.(com|sa|net|org|io)\b\S*/gi,
    /\b(Bid|Google|LinkedIn|Slack|WhatsApp|Instagram|Snapchat|Safari|Chrome|Apple|iPhone|Android|PDF|CR|VAT|SAR|API|MCP|AI|OK)\b/g,
  ];
  const INTERACTIVE =
    'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="combobox"]';
  const TEXT_INPUT_TYPES = new Set(["text", "email", "password", "tel", "number", "search", "url", "date", "datetime-local", "time", ""]);

  const px = (v) => parseFloat(v) || 0;
  const round = (n) => Math.round(n);
  const boxOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: round(r.left), y: round(r.top), w: round(r.width), h: round(r.height) };
  };
  const skipFor = (el, rule) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const ok = n.getAttribute && n.getAttribute("data-audit-ok");
      if (ok && (ok.split(/\s+/).includes(rule) || ok === "all")) return true;
    }
    return false;
  };
  const isVisible = (el) => {
    if (!el.isConnected) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    // sr-only: 1px box clipped away
    if (r.width <= 1 && r.height <= 1) return false;
    if (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)") return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  };
  const ownText = (el) =>
    Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  const shortText = (el) => (ownText(el) || el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const selectorOf = (el) => {
    if (!el || el === document.body) return "body";
    const testId = el.getAttribute("data-testid");
    if (testId) return `[data-testid="${testId}"]`;
    if (el.id && !/^radix-|^:r/.test(el.id)) return `#${CSS.escape(el.id)}`;
    const parts = [];
    for (let n = el, depth = 0; n && n !== document.body && depth < 3; n = n.parentElement, depth++) {
      const tid = n.getAttribute && n.getAttribute("data-testid");
      if (tid && depth > 0) {
        parts.unshift(`[data-testid="${tid}"]`);
        break;
      }
      let part = n.tagName.toLowerCase();
      const cls = Array.from(n.classList || []).filter((c) => !/[:[\]/]/.test(c)).slice(0, 2);
      if (cls.length) part += "." + cls.join(".");
      const siblings = n.parentElement ? Array.from(n.parentElement.children).filter((c) => c.tagName === n.tagName) : [];
      if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(n) + 1})`;
      parts.unshift(part);
    }
    return parts.join(" > ");
  };
  // Inside a box that contains its own sideways overflow (tab strips, carousels, clipped decorations)?
  const containedSideways = (el) => {
    for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (["auto", "scroll", "hidden", "clip"].includes(s.overflowX)) {
        const r = n.getBoundingClientRect();
        return r.left >= -1 && r.right <= window.innerWidth + 1;
      }
    }
    return false;
  };
  const openDialogs = () =>
    Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).filter((d) => isVisible(d) && (d.getAttribute("aria-modal") === "true" || d.getAttribute("data-state") === "open" || d.getAttribute("role") === "alertdialog"));
  const transformFlipsX = (el) => {
    for (let n = el, i = 0; n && i < 3; n = n.parentElement, i++) {
      const t = getComputedStyle(n).transform;
      if (t && t !== "none") {
        const m = t.match(/matrix\(([^)]+)\)/);
        if (m && parseFloat(m[1].split(",")[0]) < 0) return true;
      }
    }
    return false;
  };
  const luminance = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parseColor = (c) => {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 };
  };
  const backgroundBehind = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null; // gradient/image: can't judge
      const c = parseColor(s.backgroundColor);
      if (c && c.a > 0.9) return c.rgb;
    }
    return [255, 255, 255];
  };
  const isEmailInput = (el) => {
    if (el.tagName !== "INPUT") return false;
    const hint = [el.type, el.name, el.id, el.getAttribute("data-testid"), el.getAttribute("autocomplete"), el.getAttribute("placeholder")].join(" ").toLowerCase();
    return el.type === "email" || /email|e-mail|البريد/.test(hint) || /@/.test(el.getAttribute("placeholder") || "");
  };
  const otpGroups = () => {
    const groups = new Set();
    document.querySelectorAll("input").forEach((input) => {
      if (!isVisible(input)) return;
      const parent = input.parentElement;
      if (!parent) return;
      const siblings = Array.from(parent.querySelectorAll(":scope > input"));
      const small = siblings.filter((s) => s.getBoundingClientRect().width < 64);
      if (small.length >= 4) groups.add(parent);
      if ((input.getAttribute("autocomplete") || "").includes("one-time-code")) groups.add(parent);
    });
    return Array.from(groups);
  };

  function run(opts = {}) {
    const lang = opts.lang || (document.documentElement.lang === "ar" ? "ar" : "en");
    const arabicPage = lang === "ar";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const issues = [];
    const seen = new Set();
    const add = (level, rule, el, detail) => {
      if (el && el.nodeType === 1 && skipFor(el, rule)) return;
      const sel = el && el.nodeType === 1 ? selectorOf(el) : el || "";
      const key = `${rule}|${sel}|${detail || ""}`;
      if (seen.has(key)) return;
      seen.add(key);
      issues.push({ level, rule, sel, text: el && el.nodeType === 1 ? shortText(el) : "", detail: detail || "", box: el && el.nodeType === 1 ? boxOf(el) : null });
    };

    const all = Array.from(document.body.querySelectorAll("*")).filter((el) => !["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META"].includes(el.tagName));
    const visibleEls = all.filter(isVisible);
    const dialogs = openDialogs();

    // --- page health -------------------------------------------------------
    const root = document.getElementById("root");
    if (!root || root.children.length === 0 || (root.innerText || "").trim().length < 3) add("fail", "page-health", null, "the page is empty");
    if (document.querySelector("vite-error-overlay") || Array.from(document.querySelectorAll("body > *")).some((n) => /error.*(overlay|modal)|runtime-error/i.test(n.tagName))) {
      add("fail", "page-health", null, "a build/runtime error overlay is showing");
    }
    // React's dev-only "Warning: …" messages are real but not layout problems: warn, don't fail.
    consoleErrors.slice(0, 5).forEach((msg) =>
      /^Warning: /.test(msg) ? add("warn", "console-warning", null, msg.slice(0, 160)) : add("fail", "page-health", null, `console error: ${msg}`),
    );
    if (dialogs.length && !opts.expectDialog) dialogs.forEach((d) => add("fail", "dialog-open", d, "a popup is open that this screen state didn't ask for"));

    // --- direction ---------------------------------------------------------
    const html = document.documentElement;
    const wantDir = arabicPage ? "rtl" : "ltr";
    if ((html.dir || "ltr") !== wantDir || !(html.lang || "").startsWith(lang)) {
      add("fail", "html-dir", null, `<html dir="${html.dir}" lang="${html.lang}">, expected dir="${wantDir}" lang="${lang}"`);
    }

    // --- sideways overflow -------------------------------------------------
    const pageWider = Math.max(html.scrollWidth, document.body.scrollWidth) > vw + 1;
    const offenders = visibleEls.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 && r.left >= -1) return false;
      const s = getComputedStyle(el);
      if (s.pointerEvents === "none" && !ownText(el)) return false; // decoration
      if (s.position === "fixed" && (r.right <= 0 || r.left >= vw)) return false; // closed off-canvas drawer
      return !containedSideways(el);
    });
    const outermost = offenders.filter((el) => !offenders.includes(el.parentElement));
    outermost.slice(0, 6).forEach((el) => {
      const r = el.getBoundingClientRect();
      const by = Math.max(round(r.right - vw), round(-r.left));
      add("fail", "overflow", el, `${by}px past the ${r.right > vw + 1 ? "right" : "left"} edge${pageWider ? " (page scrolls sideways)" : " (cut off)"}`);
    });
    if (pageWider && outermost.length === 0) add("fail", "overflow", null, `page is ${Math.max(html.scrollWidth, document.body.scrollWidth) - vw}px wider than the screen`);

    // --- text that doesn't fit ----------------------------------------------
    visibleEls.forEach((el) => {
      if (["INPUT", "TEXTAREA", "SELECT", "svg", "IMG", "CANVAS", "VIDEO", "IFRAME"].includes(el.tagName)) return;
      const text = ownText(el);
      if (text.length < 2) return;
      const s = getComputedStyle(el);
      const lineClamp = s.webkitLineClamp && s.webkitLineClamp !== "none";
      const wide = el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0;
      const tall = el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0;
      if (wide && ["hidden", "clip"].includes(s.overflowX) && s.textOverflow !== "ellipsis") add("fail", "text-clipped", el, "text is cut off at the side");
      else if (tall && ["hidden", "clip"].includes(s.overflowY) && !lineClamp && s.textOverflow !== "ellipsis") add("fail", "text-clipped", el, "text is cut off at the bottom");
      else if (wide && s.overflowX === "visible" && s.display !== "inline" && s.whiteSpace !== "normal") add("fail", "text-spills", el, `text runs ${el.scrollWidth - el.clientWidth}px outside its box`);
    });

    // --- controls ------------------------------------------------------------
    const controls = visibleEls.filter((el) => el.matches(INTERACTIVE) && !el.disabled);
    const inView = (r) => r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
    controls.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!inView({ top: r.top + r.height / 2, left: r.left + r.width / 2, bottom: r.top + r.height / 2, right: r.left + r.width / 2 })) return;
      if (dialogs.length && !dialogs.some((d) => d.contains(el))) return;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || hit === el || el.contains(hit) || hit.contains(el)) return;
      if (hit.tagName === "LABEL" && (hit.control === el || hit.contains(el))) return;
      add("fail", "covered", el, `covered by ${selectorOf(hit)}`);
    });

    // icon inside a field on top of the typing area
    visibleEls
      .filter((el) => el.tagName === "INPUT" && TEXT_INPUT_TYPES.has(el.type))
      .forEach((input) => {
        const box = input.parentElement;
        if (!box) return;
        const r = input.getBoundingClientRect();
        const s = getComputedStyle(input);
        const textLeft = r.left + px(s.borderLeftWidth) + px(s.paddingLeft);
        const textRight = r.right - px(s.borderRightWidth) - px(s.paddingRight);
        Array.from(box.children)
          .filter((c) => c !== input && isVisible(c) && ["absolute", "fixed"].includes(getComputedStyle(c).position))
          .forEach((icon) => {
            const ir = icon.getBoundingClientRect();
            const verticalOverlap = ir.bottom > r.top && ir.top < r.bottom;
            const overlap = Math.min(ir.right, textRight) - Math.max(ir.left, textLeft);
            if (verticalOverlap && overlap > 2) add("fail", "icon-over-text", icon, `sits ${round(overlap)}px over the typing area of ${selectorOf(input)}`);
          });
      });

    // field text size (iPhone zooms on focus below 16px)
    visibleEls
      .filter((el) => (el.tagName === "INPUT" && TEXT_INPUT_TYPES.has(el.type)) || el.tagName === "TEXTAREA" || el.tagName === "SELECT")
      .forEach((el) => {
        const size = px(getComputedStyle(el).fontSize);
        if (size < 16) add("fail", "small-form-text", el, `${size}px text — iPhone zooms in when this is tapped`);
      });

    // tap targets
    const targets = controls
      .filter((el) => {
        if (el.tagName === "A" && getComputedStyle(el).display === "inline") {
          const parentText = (el.parentElement && el.parentElement.innerText) || "";
          if (parentText.trim().length > (el.innerText || "").trim().length + 8) return false; // link inside a sentence
        }
        return true;
      })
      .map((el) => {
        let r = el.getBoundingClientRect();
        const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : el.closest("label");
        if (label && isVisible(label)) {
          const lr = label.getBoundingClientRect();
          if (lr.width * lr.height > r.width * r.height) r = lr;
        }
        return { el, r };
      });
    targets.forEach(({ el, r }) => {
      const small = Math.min(r.width, r.height);
      if (small >= 44) return;
      if (small >= 24) return add("warn", "tap-target", el, `${round(r.width)}×${round(r.height)}px (44px is comfortable)`);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const crowded = targets.some((o) => {
        if (o.el === el || o.el.contains(el) || el.contains(o.el)) return false;
        const dx = Math.max(o.r.left - cx, 0, cx - o.r.right);
        const dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
        return Math.hypot(dx, dy) < 12;
      });
      add(crowded ? "fail" : "warn", "tap-target", el, `${round(r.width)}×${round(r.height)}px${crowded ? " and another control is within reach" : ""}`);
    });

    // email / password / code fields
    visibleEls.filter(isEmailInput).forEach((el) => {
      const missing = [];
      if (el.type !== "email") missing.push('type="email"');
      if (!["none", "off"].includes((el.getAttribute("autocapitalize") || "").toLowerCase())) missing.push('autocapitalize="none"');
      const ac = el.getAttribute("autocomplete");
      if (!ac || ac === "off") missing.push("autocomplete");
      if (el.getAttribute("spellcheck") !== "false") missing.push('spellcheck="false"');
      if (missing.length) add("fail", "email-field", el, `missing ${missing.join(", ")}`);
    });
    visibleEls
      .filter((el) => el.tagName === "INPUT" && el.type === "password" && !el.getAttribute("autocomplete"))
      .forEach((el) => add("warn", "password-autocomplete", el, 'add autocomplete="current-password" or "new-password"'));
    otpGroups().forEach((group) => {
      const inputs = Array.from(group.querySelectorAll(":scope > input"));
      const missing = [];
      if (!inputs.some((i) => (i.getAttribute("autocomplete") || "").includes("one-time-code"))) missing.push('autocomplete="one-time-code"');
      if (!inputs.every((i) => i.getAttribute("inputmode") === "numeric" || ["tel", "number"].includes(i.type))) missing.push('inputmode="numeric"');
      if (missing.length) add("fail", "otp-field", group, `code boxes missing ${missing.join(", ")}`);
    });

    // --- Arabic page rules ---------------------------------------------------
    if (arabicPage) {
      visibleEls
        .filter((el) => el.tagName === "INPUT" && (isEmailInput(el) || ["password", "tel", "url"].includes(el.type) || el.getAttribute("inputmode") === "numeric"))
        .forEach((el) => {
          if (getComputedStyle(el).direction !== "ltr") add("fail", "ltr-field", el, "should stay left-to-right so @ . and digits don't jump around");
        });
      const fontsSeen = new Set();
      visibleEls.forEach((el) => {
        const text = ownText(el);
        if (!text || !ARABIC.test(text)) return;
        const s = getComputedStyle(el);
        if (s.letterSpacing !== "normal" && Math.abs(px(s.letterSpacing)) > 0.1) add("fail", "arabic-spacing", el, `letter-spacing ${s.letterSpacing} breaks Arabic letter joining`);
        if (s.textAlign === "left" && s.display !== "inline") add("fail", "arabic-left", el, "Arabic text is forced to the left");
        if (s.direction === "ltr" && s.display !== "inline" && !skipFor(el, "arabic-left")) add("warn", "arabic-left", el, "Arabic text inside a left-to-right box");
        if (!/IBM Plex Sans Arabic|Tajawal/i.test(s.fontFamily) && !fontsSeen.has(s.fontFamily)) {
          fontsSeen.add(s.fontFamily);
          add("warn", "arabic-font", el, `Arabic shown in "${s.fontFamily.split(",")[0]}" — falls back to each phone's own font`);
        }
      });
      // Latin words left on an Arabic page
      visibleEls.forEach((el) => {
        if (el.closest("[data-user-content]") || ["INPUT", "TEXTAREA", "CODE", "PRE"].includes(el.tagName)) return;
        let text = ownText(el);
        if (!text) return;
        ALLOWED_LATIN.forEach((re) => (text = text.replace(re, " ")));
        const run = text.match(/[A-Za-z]{2,}(?:[\s\-'’]+[A-Za-z]{2,})+/);
        if (run) add("warn", "latin-words", el, `English left on the Arabic page: "${run[0].slice(0, 50)}"`);
      });
      // arrows that should point the other way
      document.querySelectorAll("svg.lucide").forEach((svg) => {
        if (!isVisible(svg)) return;
        const name = Array.from(svg.classList).find((c) => /^lucide-(arrow|chevron|chevrons|move)-.*(left|right)/.test(c));
        if (name && !transformFlipsX(svg)) add("warn", "unflipped-icon", svg, `${name.replace("lucide-", "")} is not mirrored for Arabic`);
      });
      dialogs.forEach((d) => {
        const close = Array.from(d.querySelectorAll("button")).find((b) => /close|إغلاق/i.test(b.textContent + " " + (b.getAttribute("aria-label") || "")));
        if (!close) return;
        const dr = d.getBoundingClientRect();
        const cr = close.getBoundingClientRect();
        if (cr.left + cr.width / 2 > dr.left + dr.width / 2) add("warn", "close-side", close, "close button is on the right; in Arabic it belongs on the left");
      });
    } else {
      visibleEls.forEach((el) => {
        const text = ownText(el);
        if (text && /[\u0660-\u0669]/.test(text) && !ARABIC.test(text.replace(/[\u0660-\u0669]/g, ""))) add("warn", "latin-words", el, "Arabic-Indic digits on the English page");
      });
    }

    // raw translation keys
    visibleEls.forEach((el) => {
      const candidates = [ownText(el), el.getAttribute("placeholder"), el.getAttribute("aria-label"), el.getAttribute("title")].filter(Boolean);
      candidates.forEach((c) => {
        const t = c.trim();
        if (I18N_KEY.test(t) && !TLDS.has(t.split(".").pop())) add("fail", "raw-key", el, `shows the key "${t}"`);
      });
    });

    // --- layout warnings -------------------------------------------------------
    const docScrolls = html.scrollHeight > vh + 1;
    if (!docScrolls) {
      visibleEls.forEach((el) => {
        const s = getComputedStyle(el);
        if (!["auto", "scroll"].includes(s.overflowY)) return;
        if (el.clientHeight >= vh * 0.6 && el.scrollHeight > el.clientHeight + 1) add("warn", "inner-scroll", el, "the page scrolls inside a box (screen-height layout) — risky on phones");
      });
    }
    visibleEls.forEach((el) => {
      const s = getComputedStyle(el);
      if (s.position !== "fixed") return;
      const r = el.getBoundingClientRect();
      if (r.bottom < vh - 1 || r.height > 220 || r.width < vw * 0.6) return;
      const hint = `${el.getAttribute("class") || ""} ${el.getAttribute("style") || ""}`;
      if (!/safe-area|env\(/.test(hint)) add("warn", "safe-area", el, "bar at the bottom has no iPhone safe-area padding");
    });

    // contrast
    let contrastCount = 0;
    visibleEls.forEach((el) => {
      if (contrastCount >= 6) return;
      const text = ownText(el);
      if (text.length < 2) return;
      const s = getComputedStyle(el);
      if (px(s.fontSize) >= 24 || px(s.opacity) < 1) return;
      const fg = parseColor(s.color);
      const bg = backgroundBehind(el);
      if (!fg || !bg || fg.a < 0.9) return;
      const [l1, l2] = [luminance(fg.rgb), luminance(bg)].sort((a, b) => b - a);
      const ratio = (l1 + 0.05) / (l2 + 0.05);
      if (ratio < 4.5) {
        contrastCount++;
        add("warn", "contrast", el, `contrast ${ratio.toFixed(2)}:1 (4.5 needed)`);
      }
    });

    issues.sort((a, b) => (a.level === b.level ? 0 : a.level === "fail" ? -1 : 1));
    const fails = issues.filter((i) => i.level === "fail").length;
    const warns = issues.length - fails;
    const capped = issues.slice(0, 60);
    return {
      url: location.pathname + location.search,
      lang,
      dir: html.dir,
      viewport: { w: vw, h: vh },
      fails,
      warns,
      issues: capped,
      text: [`${fails} fail, ${warns} warn — ${location.pathname} [${lang}] ${vw}×${vh}`]
        .concat(capped.map((i) => `${i.level.toUpperCase()} ${i.rule}: ${i.detail}${i.sel ? `  @ ${i.sel}` : ""}${i.text ? `  "${i.text}"` : ""}`))
        .join("\n"),
    };
  }

  // Run with a 400px-tall viewport ("keyboard open"): the first field and the
  // form's submit button must both be reachable and not covered.
  function keyboardCheck() {
    const problems = [];
    const field = Array.from(document.querySelectorAll("input, textarea")).find((el) => isVisible(el) && (el.tagName === "TEXTAREA" || TEXT_INPUT_TYPES.has(el.type)));
    if (!field) return { ok: true, problems };
    const form = field.closest("form");
    const submit = form && (form.querySelector('button[type="submit"]') || Array.from(form.querySelectorAll("button")).pop());
    for (const [name, el] of [["first field", field], ["submit button", submit]]) {
      if (!el || !isVisible(el)) continue;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const r = el.getBoundingClientRect();
      const within = r.top >= 0 && r.bottom <= window.innerHeight + 1;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const reachable = within && hit && (hit === el || el.contains(hit) || hit.contains(el));
      if (!reachable) problems.push({ level: "fail", rule: "keyboard-reach", sel: selectorOf(el), text: shortText(el), detail: `${name} can't be reached with the keyboard open${hit && !within ? "" : hit ? ` (covered by ${selectorOf(hit)})` : ""}`, box: boxOf(el) });
    }
    window.scrollTo(0, 0);
    return { ok: problems.length === 0, problems };
  }

  let frozen = false;
  function freeze() {
    if (frozen) return;
    frozen = true;
    const style = document.createElement("style");
    style.setAttribute("data-mobile-audit", "freeze");
    style.textContent = "*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}";
    document.head.appendChild(style);
  }

  // Wait until the page has settled: document loaded, direction applied,
  // fonts ready, no spinners or skeletons, layout stable for 300ms.
  async function ready(opts = {}) {
    const started = Date.now();
    const timeout = opts.timeout || 8000;
    const wantDir = opts.lang ? (opts.lang === "ar" ? "rtl" : "ltr") : null;
    const busy = () => Array.from(document.querySelectorAll('.animate-spin, .animate-pulse, [aria-busy="true"]')).some(isVisible);
    let lastSig = "";
    let stableSince = Date.now();
    while (Date.now() - started < timeout) {
      if (document.readyState === "complete") {
        try {
          await document.fonts.ready;
        } catch {}
        const dirOk = !wantDir || (document.documentElement.dir || "ltr") === wantDir;
        const sig = `${document.body.scrollHeight}|${document.body.innerText.length}`;
        if (sig !== lastSig) {
          lastSig = sig;
          stableSince = Date.now();
        }
        if (dirOk && (opts.allowBusy || !busy()) && Date.now() - stableSince >= 300) {
          freeze();
          return { ready: true, waitedMs: Date.now() - started };
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    freeze();
    return { ready: false, waitedMs: Date.now() - started, reason: busy() ? "still showing a spinner/skeleton" : "direction or layout never settled" };
  }

  // ---- helpers for the visible MCP window (the spec does these itself) ----
  const setCookie = (k, v) => (document.cookie = `${k}=${encodeURIComponent(v)}; path=/; SameSite=Lax`);
  async function useState(id, lang = "ar") {
    const res = await fetch(`/api/__audit/state?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`unknown state ${id} (is the guard loaded?)`);
    const { state, storage } = await res.json();
    localStorage.clear();
    sessionStorage.clear();
    Object.entries(storage || {}).forEach(([k, v]) => localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)));
    Object.entries(state.sessionStorage || {}).forEach(([k, v]) => sessionStorage.setItem(k, v));
    localStorage.setItem("language", lang);
    setCookie("audit_state", id);
    setCookie("audit_lang", lang);
    setCookie("audit_persona", state.persona || "logged-out");
    location.href = state.route;
    return `loading ${id} [${lang}] → ${state.route}; run the state's actions next (see states.json)`;
  }
  function setLang(lang) {
    localStorage.setItem("language", lang);
    setCookie("audit_lang", lang);
    location.reload();
  }
  async function guardLog() {
    const res = await fetch("/api/__audit/log");
    return res.ok ? res.json() : { error: "guard not loaded" };
  }
  async function ping() {
    try {
      const res = await fetch("/api/__audit/ping");
      return res.ok ? res.json() : { guard: false };
    } catch {
      return { guard: false };
    }
  }

  window.__mobileAudit = { run, ready, keyboardCheck, freeze, useState, setLang, guardLog, ping, consoleErrors };
})();
