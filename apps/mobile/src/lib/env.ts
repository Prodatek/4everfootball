// Expo inlines any EXPO_PUBLIC_* var into the client bundle at build time,
// same mechanism as Next's NEXT_PUBLIC_* on the web app. Defaults to the
// live public API (reachable from a physical device out of the box) rather
// than localhost, which a phone can never reach — override with a .env for
// local dev against `pnpm dev:api` (e.g. your machine's LAN IP).
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api.4ever.buildspecs.io";
