import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { MatchEventType, Player } from "@4ef/shared";
import { randomUUID } from "@/lib/uuid";
import { fourthOfficial as fo } from "@/theme/fourth-official";
import { MATCH_EVENT_LABELS } from "./event-labels";
import { EVENT_FIELD_REQUIREMENTS } from "./event-field-requirements";
import type { RecordMatchEventInput } from "./api";

interface TeamOption {
  id: string;
  name: string;
}

interface RecordEventSheetProps {
  eventType: MatchEventType | null;
  homeTeam: TeamOption;
  awayTeam: TeamOption;
  squads: Record<string, Player[]>;
  defaultMinute: number;
  onCancel: () => void;
  onConfirm: (input: RecordMatchEventInput) => void;
}

// The parent remounts this with a fresh `key` every time it opens (see
// fixtures/[id].tsx), so local state here doubles as the "reset on open"
// mechanism.
export function RecordEventSheet({
  eventType,
  homeTeam,
  awayTeam,
  squads,
  defaultMinute,
  onCancel,
  onConfirm,
}: RecordEventSheetProps) {
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [secondPlayerId, setSecondPlayerId] = useState("");
  const [minute, setMinute] = useState(String(defaultMinute));

  if (!eventType) return null;

  const requirement = EVENT_FIELD_REQUIREMENTS[eventType];
  const needsTeam = requirement !== "none";
  const needsPlayer =
    requirement === "team-player" ||
    requirement === "team-player-assist" ||
    requirement === "team-player-sub";
  const needsAssist = requirement === "team-player-assist";
  const needsSubOff = requirement === "team-player-sub";
  const canConfirm = (!needsTeam || teamId) && (!needsPlayer || playerId);
  const squad = teamId ? (squads[teamId] ?? []) : [];

  function selectTeam(id: string) {
    setTeamId(id);
    setPlayerId("");
    setSecondPlayerId("");
  }

  function handleConfirm() {
    onConfirm({
      clientEventId: randomUUID(),
      type: eventType!,
      minute: Number(minute) || 0,
      teamId: needsTeam ? teamId : undefined,
      playerId: needsPlayer ? playerId : undefined,
      assistPlayerId: needsAssist && secondPlayerId ? secondPlayerId : undefined,
      metadata: needsSubOff && secondPlayerId ? { playerOffId: secondPlayerId } : undefined,
    });
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView>
            <Text style={styles.title}>{MATCH_EVENT_LABELS[eventType].toUpperCase()}</Text>

            {needsTeam && (
              <View style={styles.field}>
                <Text style={styles.label}>TEAM</Text>
                <View style={styles.teamRow}>
                  <Pressable
                    style={[styles.teamButton, teamId === homeTeam.id && styles.teamButtonActive]}
                    onPress={() => selectTeam(homeTeam.id)}
                  >
                    <Text style={teamId === homeTeam.id ? styles.teamTextActive : styles.teamText}>
                      {homeTeam.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.teamButton, teamId === awayTeam.id && styles.teamButtonActive]}
                    onPress={() => selectTeam(awayTeam.id)}
                  >
                    <Text style={teamId === awayTeam.id ? styles.teamTextActive : styles.teamText}>
                      {awayTeam.name}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {needsPlayer && (
              <View style={styles.field}>
                <Text style={styles.label}>{needsSubOff ? "PLAYER COMING ON" : "PLAYER"}</Text>
                {squad.length === 0 && (
                  <Text style={styles.hint}>
                    {teamId ? "No players found for this team." : "Select a team first."}
                  </Text>
                )}
                <View style={styles.playerList}>
                  {squad.map((player) => (
                    <Pressable
                      key={player.id}
                      style={[
                        styles.playerButton,
                        playerId === player.id && styles.playerButtonActive,
                      ]}
                      onPress={() => setPlayerId(player.id)}
                    >
                      <Text style={playerId === player.id ? styles.teamTextActive : styles.teamText}>
                        {player.firstName} {player.lastName}
                        {player.shirtNumber ? ` #${player.shirtNumber}` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {(needsAssist || needsSubOff) && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {needsSubOff ? "PLAYER GOING OFF" : "ASSIST (OPTIONAL)"}
                </Text>
                <View style={styles.playerList}>
                  {squad
                    .filter((player) => player.id !== playerId)
                    .map((player) => (
                      <Pressable
                        key={player.id}
                        style={[
                          styles.playerButton,
                          secondPlayerId === player.id && styles.playerButtonActive,
                        ]}
                        onPress={() => setSecondPlayerId(player.id)}
                      >
                        <Text
                          style={secondPlayerId === player.id ? styles.teamTextActive : styles.teamText}
                        >
                          {player.firstName} {player.lastName}
                          {player.shirtNumber ? ` #${player.shirtNumber}` : ""}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>MINUTE</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={minute}
                onChangeText={setMinute}
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              disabled={!canConfirm}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>CONFIRM</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,23,26,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: fo.color.surface,
    borderTopWidth: 3,
    borderColor: fo.color.line,
    padding: 20,
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontFamily: fo.font.display, color: fo.color.ink, marginBottom: 16 },
  field: { marginBottom: 16, gap: 8 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: fo.color.inkDim },
  hint: { fontSize: 13, color: fo.color.inkDim },
  teamRow: { flexDirection: "row", gap: 8 },
  teamButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: fo.color.line,
    alignItems: "center",
  },
  teamButtonActive: { backgroundColor: fo.color.accent, borderColor: fo.color.accent },
  teamText: { color: fo.color.ink, fontWeight: "700", fontSize: 13 },
  teamTextActive: { color: fo.color.accentInk, fontWeight: "700", fontSize: 13 },
  playerList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  playerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: fo.color.line,
  },
  playerButtonActive: { backgroundColor: fo.color.accent, borderColor: fo.color.accent },
  input: {
    borderWidth: 2,
    borderColor: fo.color.line,
    padding: 10,
    fontSize: 16,
    fontFamily: fo.font.mono,
    color: fo.color.ink,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  cancelButton: { flex: 1, padding: 16, alignItems: "center" },
  cancelText: { color: fo.color.inkDim, fontWeight: "800", letterSpacing: 0.4 },
  confirmButton: {
    flex: 1,
    padding: 16,
    backgroundColor: fo.color.accent,
    alignItems: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmText: { color: fo.color.accentInk, fontFamily: fo.font.displayBold, letterSpacing: 0.5 },
});
