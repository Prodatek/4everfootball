// Web's record-event-dialog.tsx uses the browser's crypto.randomUUID(). RN's
// Hermes engine support for that varies by version/platform, and this ID is
// only ever used as a client-side idempotency key (not for anything
// security-sensitive), so a dependency-free v4-shaped generator avoids
// pulling in expo-crypto just for this.
export function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
