import { useFonts } from "expo-font";
import { BigShouldersDisplay_900Black } from "@expo-google-fonts/big-shoulders-display";
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_600SemiBold,
} from "@expo-google-fonts/ibm-plex-sans";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono";
import { Archivo_700Bold, Archivo_900Black } from "@expo-google-fonts/archivo";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";

// Both design systems' fonts load together up front — Floodlight for the
// (public) tabs, Fourth Official for the (scout) tool — so switching between
// them (which happens on every login/logout) never has to wait on a second
// font fetch.
export function useAppFonts() {
  return useFonts({
    BigShouldersDisplay_900Black,
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_600SemiBold,
    Archivo_700Bold,
    Archivo_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });
}
