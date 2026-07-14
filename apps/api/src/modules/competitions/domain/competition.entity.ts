import type { CompetitionType } from '@prisma/client';

export interface CompetitionProps {
  id: string;
  name: string;
  slug: string;
  type: CompetitionType;
  country: string | null;
  season: string;
  startDate: Date | null;
  endDate: Date | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CompetitionEntity {
  constructor(private readonly props: CompetitionProps) {}

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
