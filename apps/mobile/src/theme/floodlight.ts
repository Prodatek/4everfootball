// The public-facing brand, ported from apps/web's "Floodlight" identity
// (see apps/web/src/app/globals.css) — violet-black, built for the stands.
export const floodlight = {
  color: {
    bg: "#0d0812",
    surface: "#1a1024",
    surfaceElevated: "#241531",
    ink: "#f4eff9",
    inkDim: "#b6a6c8",
    brand: "#a238ff",
    brandInk: "#ffffff",
    live: "#35d07f",
    danger: "#ff5470",
    yellow: "#f2c94c",
    line: "rgba(244,239,249,0.12)",
  },
  font: {
    display: "BigShouldersDisplay_900Black",
    body: "IBMPlexSans_400Regular",
    bodySemibold: "IBMPlexSans_600SemiBold",
    mono: "IBMPlexMono_600SemiBold",
  },
  radius: { sm: 8, md: 12, lg: 16 },
} as const;

export type Floodlight = typeof floodlight;

// Shared header options for every (public) nested Stack layout — one place
// to keep the five tab stacks' headers consistent.
export const floodlightStackScreenOptions = {
  headerStyle: { backgroundColor: floodlight.color.surface },
  headerTintColor: floodlight.color.ink,
  headerTitleStyle: { fontFamily: floodlight.font.display, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: floodlight.color.bg },
};
