// The scout tool's own identity, modeled on a match official's kit: the
// substitution board, the stopwatch, the cards themselves. `undefined` for
// the body font deliberately falls through to the OS system font — a fast,
// native, no-fuss choice for a pitch-side working tool, not an oversight.
export const fourthOfficial = {
  color: {
    bg: "#fafaf7",
    surface: "#ffffff",
    ink: "#14171a",
    inkDim: "#5b6066",
    accent: "#ff5a1f",
    accentInk: "#ffffff",
    cardYellow: "#ffc736",
    cardRed: "#e12d2d",
    live: "#1e8e3e",
    line: "#14171a",
    lineSoft: "#d8d8d2",
  },
  font: {
    display: "Archivo_900Black",
    displayBold: "Archivo_700Bold",
    body: undefined as string | undefined,
    mono: "SpaceMono_700Bold",
  },
  radius: { sm: 4, md: 4, lg: 6 },
} as const;

export type FourthOfficial = typeof fourthOfficial;
