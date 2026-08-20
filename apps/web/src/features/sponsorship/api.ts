import { apiClient } from "@/lib/api-client";

// @4ef/shared has no sponsorship types yet — same local-duplication
// precedent as CompetitionWithLicence in features/competitions/api.ts
// rather than editing the shared package for this pass.

export interface SponsorDashboard {
  competitionName: string;
  competitionLogoUrl: string | null;
  sponsorLogoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  teamsRegistered: number;
  playersRegistered: number;
  matchesPlayed: number;
  matchesVerified: number;
  communitiesCovered: number;
  totalMinutes: number;
  pageViews: number;
  graphicsShared: number;
}

export interface ImpactReportDataset {
  competitionName: string;
  season: string;
  generatedAt: string;
  reach: {
    teamsRegistered: number;
    playersRegistered: number;
    matchesPlayed: number;
    matchesVerified: number;
    communitiesCovered: number;
    totalMinutes: number;
    pageViews: number;
    graphicsShared: number;
    brandedGraphicsDelivered: number;
  };
  teamsAndCommunities: Array<{ teamName: string; community: string | null }>;
  playersByAgeGroupAndGender: Array<{ ageGroup: string; gender: string; count: number }>;
  playerOutcomes: Array<{
    playerName: string;
    type: string;
    description: string;
    sourceNote: string;
    occurredAt: string;
  }>;
}

// Public, ungated — matches the backend's own design (see
// SponsorDashboardController's comment: "marketing collateral, not a paid
// deliverable"). No auth header needed, works from a bare shared link.
export async function fetchSponsorDashboard(slug: string): Promise<SponsorDashboard> {
  const { data } = await apiClient.get<SponsorDashboard>(`/competitions/${slug}/sponsor-dashboard`);
  return data;
}

// Everything below requires a logged-in organiser session AND a
// SponsorEntitlement for IMPACT_REPORT on that competition — the API
// throws 403 if either is missing, surfaced by the caller as a plain
// "not available" state, not a scary error.
export async function fetchImpactReportJson(competitionId: string): Promise<ImpactReportDataset> {
  const { data } = await apiClient.get<ImpactReportDataset>(
    `/competitions/${competitionId}/impact-report/json`,
  );
  return data;
}

export async function generateImpactReportPdf(competitionId: string): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>(
    `/competitions/${competitionId}/impact-report/pdf`,
  );
  return data;
}

// The CSV route needs the Authorization header (this app never uses
// cookie-based auth for the access token — see api-client.ts), so a plain
// <a href> to the API can't carry it. Fetched as a blob through the
// authenticated client instead, then saved via a throwaway <a download>.
export async function downloadImpactReportCsv(competitionId: string): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/competitions/${competitionId}/impact-report/csv`, {
    responseType: "blob",
  });

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "impact-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
