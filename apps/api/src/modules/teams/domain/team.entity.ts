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
