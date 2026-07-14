import type { Role } from '@4ef/shared';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  roles: Role[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  constructor(private readonly props: UserProps) {}

  get id() {
    return this.props.id;
  }

  get email() {
    return this.props.email;
  }

  get passwordHash() {
    return this.props.passwordHash;
  }

  get displayName() {
    return this.props.displayName;
  }

  get roles() {
    return this.props.roles;
  }

  get isActive() {
    return this.props.isActive;
  }

  toPublic() {
    return {
      id: this.props.id,
      email: this.props.email,
      displayName: this.props.displayName,
      roles: this.props.roles,
      createdAt: this.props.createdAt,
    };
  }
}
