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
  team: { id: string; name: string; slug: string };
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

/**
 * Brief §5 B4: "Support partial payment — a club can pay for 15 of 20
 * players; only the paid 15 become eligible." `registrationIds` is
 * whatever subset the club chose to pay for right now — the API sums
 * only those rows' stored `priceKobo`, never "everything unpaid."
 */
export async function checkoutRegistrations(
  competitionId: string,
  registrationIds: string[],
  organisationId: string,
  provider: "PAYSTACK" | "BANK_TRANSFER" | "CASH",
  payerEmail?: string,
): Promise<{ payment: { id: string }; authorizationUrl: string | null }> {
  const { data } = await apiClient.post(
    `/competitions/${competitionId}/registrations/checkout`,
    { registrationIds, organisationId, provider, payerEmail },
  );
  return data;
}

/** Brief §5 B5 — the club-side call that fetches the token to build its
 * own shareable status link. Authenticated, org-scoped. */
export async function fetchSquadShareToken(
  competitionId: string,
  teamId: string,
): Promise<string> {
  const { data } = await apiClient.get<{ token: string }>(
    `/competitions/${competitionId}/registrations/share-token`,
    { params: { teamId } },
  );
  return data.token;
}

export interface PublicSquadStatus {
  competitionName: string;
  teamName: string;
  teamLogoUrl: string | null;
  players: { firstName: string; lastName: string; status: RegistrationStatus }[];
  totalPlayers: number;
  paidPlayers: number;
  outstandingKobo: number;
}

/** The no-login side of the same link — see the API's squad-share-token.ts. */
export async function fetchPublicSquadStatus(
  competitionId: string,
  teamId: string,
  token: string,
): Promise<PublicSquadStatus> {
  const { data } = await apiClient.get<PublicSquadStatus>(
    `/competitions/${competitionId}/registrations/public`,
    { params: { teamId, token } },
  );
  return data;
}

/**
 * Brief §5 B6: "a manual override for the club that paid cash at the
 * venue — which must capture a reason and show that the record is marked
 * as an override, because it is logged." The organiser's own action, not
 * the club's — see the API's recordCashOverride() for why this is a
 * separate call from checkoutRegistrations() rather than the same one.
 */
export async function recordCashOverride(
  competitionId: string,
  registrationIds: string[],
  reason: string,
): Promise<void> {
  await apiClient.post(`/competitions/${competitionId}/registrations/cash-override`, {
    registrationIds,
    reason,
  });
}
