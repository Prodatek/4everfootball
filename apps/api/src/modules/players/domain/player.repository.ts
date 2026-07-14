import type { PlayerPosition, PreferredFoot } from '@prisma/client';
import type { PlayerEntity } from './player.entity';

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export type PlayerSortField =
  'firstName' | 'lastName' | 'shirtNumber' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export interface PlayerListFilters {
  page: number;
  limit: number;
  search?: string;
  teamId?: string;
  position?: PlayerPosition;
  nationality?: string;
  sortBy: PlayerSortField;
  sortOrder: SortOrder;
  includeInactive?: boolean;
}

export interface PlayerListResult {
  items: PlayerEntity[];
  total: number;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  slug: string;
  dateOfBirth?: Date;
  nationality?: string;
  position?: PlayerPosition;
  shirtNumber?: number;
  heightCm?: number;
  preferredFoot?: PreferredFoot;
  photoUrl?: string;
  teamId?: string | null;
}

export type UpdatePlayerInput = Partial<Omit<CreatePlayerInput, 'slug'>> & {
  slug?: string;
  isActive?: boolean;
};

export interface PlayerRepository {
  findMany(filters: PlayerListFilters): Promise<PlayerListResult>;
  findById(id: string): Promise<PlayerEntity | null>;
  findBySlug(slug: string): Promise<PlayerEntity | null>;
  slugExists(slug: string): Promise<boolean>;
  create(input: CreatePlayerInput): Promise<PlayerEntity>;
  update(id: string, input: UpdatePlayerInput): Promise<PlayerEntity>;
  delete(id: string): Promise<void>;
}
