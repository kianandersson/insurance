// Dead-simple path router: no library. The server's SPA fallback serves index.html
// for any non-asset path, so /leads/:id survives a refresh and reads its id from here.

import { useEffect, useState } from "react";

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    window.addEventListener("app:navigate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("app:navigate", onPop);
    };
  }, []);
  return path;
}

export function navigate(to: string): void {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new Event("app:navigate"));
}
