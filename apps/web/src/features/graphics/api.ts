import { apiClient } from "@/lib/api-client";

// @4ef/shared has no graphics types yet — same local-duplication precedent
// as everywhere else in features/*/api.ts.

export type GraphicTemplate =
  | "FULL_TIME_RESULT"
  | "GOAL_ALERT"
  | "MATCHDAY_FIXTURES"
  | "LEAGUE_TABLE"
  | "TOP_SCORERS"
  | "PLAYER_OF_WEEK"
  | "PLAYER_PASSPORT"
  | "HEAD_TO_HEAD"
  | "MILESTONE"
  | "SEASON_SUMMARY";

export type GraphicStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

export interface Graphic {
  id: string;
  template: GraphicTemplate;
  format: "SQUARE" | "PORTRAIT" | "STORY";
  status: GraphicStatus;
  competitionId: string | null;
  subjectType: string;
  subjectId: string;
  mediaKey: string | null;
  publicUrl: string | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  readyAt: string | null;
  shareCount: number;
}

export const GRAPHIC_TEMPLATE_LABELS: Record<GraphicTemplate, string> = {
  FULL_TIME_RESULT: "Full-time result",
  GOAL_ALERT: "Goal alert",
  MATCHDAY_FIXTURES: "Matchday fixtures",
  LEAGUE_TABLE: "League table",
  TOP_SCORERS: "Top scorers",
  PLAYER_OF_WEEK: "Player of the week",
  PLAYER_PASSPORT: "Player passport",
  HEAD_TO_HEAD: "Head to head",
  MILESTONE: "Milestone",
  SEASON_SUMMARY: "Season summary",
};

export interface GraphicsQuery {
  template?: GraphicTemplate;
  teamId?: string;
  fixtureId?: string;
}

export async function fetchGraphicsForCompetition(
  competitionId: string,
  query: GraphicsQuery = {},
): Promise<Graphic[]> {
  const { data } = await apiClient.get<Graphic[]>(`/competitions/${competitionId}/graphics`, {
    params: query,
  });
  return data;
}

// The zip route needs the Authorization header (no cookie-based auth in
// this app), so a plain <a href> to the API can't carry it — same reasoning
// and pattern as the impact-report CSV download in Phase E.
export async function downloadGraphicsZip(
  competitionId: string,
  query: GraphicsQuery = {},
): Promise<void> {
  const { data } = await apiClient.get<Blob>(`/competitions/${competitionId}/graphics/zip`, {
    params: query,
    responseType: "blob",
  });

  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = "graphics.zip";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Plain <a download> is unreliable across browsers for a cross-origin S3
// URL (Chrome and others silently ignore `download` and just navigate
// instead, unless the response itself sends Content-Disposition:
// attachment, which S3/MinIO doesn't for these) — fetched and saved as a
// blob instead, same approach as the zip download above.
export async function downloadGraphicImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function fetchGraphicById(id: string): Promise<Graphic> {
  const { data } = await apiClient.get<Graphic>(`/graphics/${id}`);
  return data;
}

export async function shareGraphicToWhatsapp(id: string): Promise<{ whatsappUrl: string }> {
  const { data } = await apiClient.get<{ whatsappUrl: string }>(`/graphics/${id}/share/whatsapp`);
  return data;
}
