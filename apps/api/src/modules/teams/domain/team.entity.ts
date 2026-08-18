export interface TeamProps {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  country: string | null;
  foundedYear: number | null;
  logoUrl: string | null;
  venueName: string | null;
  isActive: boolean;
  // Was always on the underlying Prisma record (toPublic() already spread
  // it onto every API response) but never declared here, so nothing inside
  // this module could type-check reading it. Needed for
  // TeamsService.claim() — see MONETISATION_UI_BRIEF.md §5 B2.
  organisationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TeamEntity {
  constructor(private readonly props: TeamProps) {}

  get id() {
    return this.props.id;
  }

  get slug() {
    return this.props.slug;
  }

  toPublic() {
    return { ...this.props };
  }
}
