import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import type {
  AuthTokens,
  JwtAccessPayload,
  JwtRefreshPayload,
  Role,
} from '@4ef/shared';
import { PrismaService } from '../../../../common/prisma/prisma.service';

const REFRESH_TOKEN_BYTES_ROUNDS = 10;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokenPair(
    userId: string,
    email: string,
    roles: Role[],
    createdByIp?: string,
  ): Promise<AuthTokens> {
    const accessPayload: JwtAccessPayload = { sub: userId, email, roles };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL'),
    });

    const tokenId = randomUUID();
    const refreshPayload: JwtRefreshPayload = { sub: userId, tokenId };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL'),
    });

    const tokenHash = await bcrypt.hash(
      refreshToken,
      REFRESH_TOKEN_BYTES_ROUNDS,
    );
    const expiresAt = this.resolveExpiry(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '30d',
    );

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        expiresAt,
        createdByIp,
      },
    });

    return { accessToken, refreshToken };
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtRefreshPayload> {
    return this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  async validateStoredToken(tokenId: string, refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return null;
    }

    const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
    return matches ? stored : null;
  }

  async revokeToken(tokenId: string, replacedById?: string) {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date(), replacedById },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private resolveExpiry(ttl: string): Date {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    const now = Date.now();

    if (!match) {
      return new Date(now + 30 * 24 * 60 * 60 * 1000);
    }

    const value = Number(match[1]);
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      match[2] as 's' | 'm' | 'h' | 'd'
    ];

    return new Date(now + value * unitMs);
  }
}
