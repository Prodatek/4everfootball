export interface Team {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  country: string | null;
  foundedYear: number | null;
  logoUrl: string | null;
  venueName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
