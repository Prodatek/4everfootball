import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { CanActivate } from '@nestjs/common';
import type { JwtAccessPayload, Role } from '@4ef/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtAccessPayload | undefined = request.user;

    if (!user || !requiredRoles.some((role) => user.roles.includes(role))) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
