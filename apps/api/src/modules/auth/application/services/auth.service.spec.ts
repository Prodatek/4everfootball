import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UsersService } from '../../../users/application/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tokenService: jest.Mocked<TokenService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            register: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            issueTokenPair: jest.fn(),
            verifyRefreshToken: jest.fn(),
            validateStoredToken: jest.fn(),
            revokeToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    tokenService = moduleRef.get(TokenService);
  });

  it('rejects login with a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'scout@4everfootball.com',
      passwordHash,
      displayName: 'Scout',
      roles: ['USER'],
      isActive: true,
      toPublic: () => ({}),
    } as never);

    await expect(
      authService.login({
        email: 'scout@4everfootball.com',
        password: 'wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login for unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nobody@4everfootball.com',
        password: 'whatever',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues a token pair on successful login', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'scout@4everfootball.com',
      passwordHash,
      displayName: 'Scout',
      roles: ['USER'],
      isActive: true,
      toPublic: () => ({ id: 'user-1' }),
    } as never);
    tokenService.issueTokenPair.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await authService.login({
      email: 'scout@4everfootball.com',
      password: 'correct-password',
    });

    expect(result.tokens.accessToken).toBe('access');
    expect(tokenService.issueTokenPair).toHaveBeenCalledWith(
      'user-1',
      'scout@4everfootball.com',
      ['USER'],
      undefined,
    );
  });
});
