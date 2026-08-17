import { apiClient } from "@/lib/api-client";

export interface GuardianConsentInput {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export type RegistrationStatus = "DRAFT" | "PENDING_PAYMENT" | "CONFIRMED" | "LOCKED";

export interface PlayerRegistration {
  id: string;
  competitionId: string;
  teamId: string;
  playerId: string;
  status: RegistrationStatus;
  priceKobo: number;
  paymentId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianConsentAt: string | null;
  player: { id: string; firstName: string; lastName: string; photoUrl: string | null };
}

/**
 * Upserts a DRAFT PlayerRegistration row (guardian consent + joins the
 * player to this competition, price set server-side).
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

export async function fetchRegistrationsForCompetition(
  competitionId: string,
  teamId?: string,
): Promise<PlayerRegistration[]> {
  const { data } = await apiClient.get<PlayerRegistration[]>(
    `/competitions/${competitionId}/registrations`,
    { params: teamId ? { teamId } : undefined },
  );
  return data;
}
