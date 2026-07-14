import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../../../users/application/users.service';
import { TokenService } from './token.service';
import type { RegisterDto } from '../dto/register.dto';
import type { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto, ip?: string) {
    const user = await this.usersService.register({
      email: dto.email,
      password: dto.password,
      displayName: dto.displayName,
    });

    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.email,
      user.roles,
      ip,
    );

    return { user: user.toPublic(), tokens };
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.email,
      user.roles,
      ip,
    );

    return { user: user.toPublic(), tokens };
  }

  async refresh(refreshToken: string, ip?: string) {
    let payload;

    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.tokenService.validateStoredToken(
      payload.tokenId,
      refreshToken,
    );

    if (!stored) {
      throw new UnauthorizedException(
        'Refresh token has been revoked or reused',
      );
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }

    const tokens = await this.tokenService.issueTokenPair(
      user.id,
      user.email,
      user.roles,
      ip,
    );

    await this.tokenService.revokeToken(payload.tokenId);

    return { user: user.toPublic(), tokens };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      await this.tokenService.revokeToken(payload.tokenId);
    } catch {
      // Token already invalid/expired — logout is idempotent either way.
    }
  }
}
