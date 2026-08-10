import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { MatchEventType, Player } from "@4ef/shared";
import { randomUUID } from "@/lib/uuid";
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

// RN Modal equivalent of web's record-event-dialog.tsx. The parent remounts
// this with a fresh `key` every time it opens (see fixtures/[id].tsx), so
// local state here doubles as the "reset on open" mechanism.
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
            <Text style={styles.title}>{MATCH_EVENT_LABELS[eventType]}</Text>

            {needsTeam && (
              <View style={styles.field}>
                <Text style={styles.label}>Team</Text>
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
                <Text style={styles.label}>{needsSubOff ? "Player coming on" : "Player"}</Text>
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
                        {player.shirtNumber ? ` (#${player.shirtNumber})` : ""}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {(needsAssist || needsSubOff) && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  {needsSubOff ? "Player going off" : "Assist (optional)"}
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
                          {player.shirtNumber ? ` (#${player.shirtNumber})` : ""}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Minute</Text>
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
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
              disabled={!canConfirm}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "85%",
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  field: { marginBottom: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151" },
  hint: { fontSize: 13, color: "#9ca3af" },
  teamRow: { flexDirection: "row", gap: 8 },
  teamButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  teamButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  teamText: { color: "#111827", fontWeight: "600" },
  teamTextActive: { color: "#fff", fontWeight: "600" },
  playerList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  playerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  playerButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  cancelButton: { flex: 1, padding: 14, alignItems: "center" },
  cancelText: { color: "#6b7280", fontWeight: "600" },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmText: { color: "#fff", fontWeight: "700" },
});
