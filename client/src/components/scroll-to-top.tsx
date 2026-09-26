import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

// wouter keeps the window's scroll position when the page changes, so a footer
// link opened the next page already scrolled to its bottom. A new page starts at
// the top; Back/Forward is left to the browser's own scroll restoration.
//
// The popstate listener is registered at import time on purpose: wouter's own
// listener re-renders synchronously, so a listener added later (in an effect)
// fires after the location effect below has already run.
let poppedTo: string | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    poppedTo = window.location.pathname;
  });
}

export function ScrollToTopOnNavigate() {
  const [location] = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (poppedTo !== null) {
      const wasPop = poppedTo === window.location.pathname;
      poppedTo = null;
      if (wasPop) return;
    }
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}
