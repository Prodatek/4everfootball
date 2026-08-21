import type { Invoice } from "@/features/invoices/api";
import { apiClient } from "@/lib/api-client";

// @4ef/shared has no academy types yet — same local-duplication precedent
// as CompetitionWithLicence/SponsorDashboard elsewhere in features/*/api.ts.

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AcademyPlanKey = "STARTER" | "GROWTH" | "ELITE";

export interface AgeGroup {
  id: string;
  organisationId: string;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  createdAt: string;
  teams: Array<{ id: string; name: string }>;
}

export interface AcademyDashboard {
  ageGroupCount: number;
  rosterSize: number;
  attendanceThisWeek: { present: number; total: number };
}

export interface AcademyAttendance {
  id: string;
  organisationId: string;
  ageGroupId: string;
  playerId: string;
  date: string;
  status: AttendanceStatus;
  recordedById: string;
  clientEventId: string;
  createdAt: string;
}

export interface AcademySubscription {
  id: string;
  organisationId: string;
  planKey: AcademyPlanKey;
  startDate: string;
  endDate: string;
  invoiceId: string;
  invoice: Invoice;
  createdAt: string;
}

// A plan choice awaiting a platform admin's payment confirmation — the
// AcademySubscription itself doesn't exist yet (see the schema comment on
// AcademySubscriptionRequest for why this is a separate step).
export interface AcademySubscriptionRequest {
  id: string;
  organisationId: string;
  planKey: AcademyPlanKey;
  prepay: boolean;
  invoiceId: string;
  invoice: Invoice;
  activatedAt: string | null;
  createdAt: string;
}

export interface AcademySubscriptionRequestWithOrg extends AcademySubscriptionRequest {
  organisation: { name: string };
}

export async function fetchAgeGroups(organisationId: string): Promise<AgeGroup[]> {
  const { data } = await apiClient.get<AgeGroup[]>(
    `/organisations/${organisationId}/academy/age-groups`,
  );
  return data;
}

export async function fetchAcademyDashboard(organisationId: string): Promise<AcademyDashboard> {
  const { data } = await apiClient.get<AcademyDashboard>(
    `/organisations/${organisationId}/academy/age-groups/dashboard`,
  );
  return data;
}

export async function createAgeGroup(
  organisationId: string,
  input: { name: string; minAge?: number; maxAge?: number },
): Promise<AgeGroup> {
  const { data } = await apiClient.post<AgeGroup>(
    `/organisations/${organisationId}/academy/age-groups`,
    input,
  );
  return data;
}

export async function assignTeamToAgeGroup(
  organisationId: string,
  ageGroupId: string,
  teamId: string,
): Promise<{ assigned: true }> {
  const { data } = await apiClient.post<{ assigned: true }>(
    `/organisations/${organisationId}/academy/age-groups/${ageGroupId}/team`,
    { teamId },
  );
  return data;
}

export async function enrollPlayer(
  organisationId: string,
  ageGroupId: string,
  playerId: string,
): Promise<{ teamId: string }> {
  const { data } = await apiClient.post<{ teamId: string }>(
    `/organisations/${organisationId}/academy/age-groups/${ageGroupId}/players/${playerId}/enroll`,
  );
  return data;
}

export async function fetchAttendanceForAgeGroup(
  organisationId: string,
  ageGroupId: string,
  from?: string,
  to?: string,
): Promise<AcademyAttendance[]> {
  const { data } = await apiClient.get<AcademyAttendance[]>(
    `/organisations/${organisationId}/academy/attendance/${ageGroupId}`,
    { params: { from, to } },
  );
  return data;
}

export interface RecordAttendanceInput {
  clientEventId: string;
  ageGroupId: string;
  playerId: string;
  date: string;
  status: AttendanceStatus;
}

export async function recordAttendance(
  organisationId: string,
  input: RecordAttendanceInput,
): Promise<AcademyAttendance> {
  const { data } = await apiClient.post<AcademyAttendance>(
    `/organisations/${organisationId}/academy/attendance`,
    input,
  );
  return data;
}

export async function fetchCurrentSubscription(
  organisationId: string,
): Promise<AcademySubscription | null> {
  const { data } = await apiClient.get<AcademySubscription | null>(
    `/organisations/${organisationId}/academy/subscription`,
  );
  return data;
}

export async function fetchSubscriptionHistory(
  organisationId: string,
): Promise<AcademySubscription[]> {
  const { data } = await apiClient.get<AcademySubscription[]>(
    `/organisations/${organisationId}/academy/subscription/history`,
  );
  return data;
}

// §5 F5: "we chose a plan, still waiting for it to be confirmed" — distinct
// from fetchCurrentSubscription(), which only ever reflects an already
// activated plan.
export async function fetchPendingSubscriptionRequest(
  organisationId: string,
): Promise<AcademySubscriptionRequest | null> {
  const { data } = await apiClient.get<AcademySubscriptionRequest | null>(
    `/organisations/${organisationId}/academy/subscription/pending`,
  );
  return data;
}

export async function subscribeAcademyPlan(
  organisationId: string,
  planKey: AcademyPlanKey,
  prepay: boolean,
): Promise<AcademySubscriptionRequest> {
  const { data } = await apiClient.post<AcademySubscriptionRequest>(
    `/organisations/${organisationId}/academy/subscription`,
    { planKey, prepay },
  );
  return data;
}

// §5 D2, internal-only.
export async function fetchPendingSubscriptionRequests(): Promise<
  AcademySubscriptionRequestWithOrg[]
> {
  const { data } = await apiClient.get<AcademySubscriptionRequestWithOrg[]>(
    "/academy/subscription-requests",
  );
  return data;
}

export async function confirmSubscriptionRequest(
  requestId: string,
): Promise<AcademySubscription> {
  const { data } = await apiClient.post<AcademySubscription>(
    `/academy/subscription-requests/${requestId}/confirm`,
  );
  return data;
}

export interface TermlyReportResult {
  dataset: {
    playerName: string;
    teamName: string | null;
    organisationName: string;
    periodLabel: string;
    attendance: { present: number; total: number; ratePercent: number };
    goals: number;
    assists: number;
  };
  url: string;
  whatsappUrl: string;
}

export async function generateTermlyReport(
  organisationId: string,
  ageGroupId: string,
  playerId: string,
  from: string,
  to: string,
): Promise<TermlyReportResult> {
  const { data } = await apiClient.post<TermlyReportResult>(
    `/organisations/${organisationId}/academy/age-groups/${ageGroupId}/players/${playerId}/termly-report`,
    undefined,
    { params: { from, to } },
  );
  return data;
}
