"use client";

import { useEffect, useState } from "react";

// Brief §4.4: "connection state is permanently visible, never hidden in a
// menu." Backs both C1's cached-list banner and C2's persistent sync
// indicator — one source of truth for "are we actually online right now."
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
