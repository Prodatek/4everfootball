import { apiClient } from "@/lib/api-client";

export interface GuardianConsentInput {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

/**
 * Upserts a DRAFT PlayerRegistration row (guardian consent + joins the
 * player to this competition, price set server-side). There's no GET for
 * this today (see MONETISATION_UI_INVENTORY.md follow-up notes), so this
 * screen can write consent but can't read back whether a given player was
 * already registered after a page reload — flagged, not hidden.
 */
export async function registerPlayerForCompetition(
  competitionId: string,
  teamId: string,
  playerId: string,
  guardianConsent: GuardianConsentInput,
): Promise<void> {
  await apiClient.post(`/competitions/${competitionId}/registrations`, {
    teamId,
    playerId,
    ...guardianConsent,
  });
}
