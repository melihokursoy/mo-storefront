import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const gqlContext = context.getArgByIndex(2);

    if (!gqlContext.token) {
      throw new Error('Unauthorized: Missing authentication token');
    }

    try {
      const decoded = this.jwtService.verify(gqlContext.token);
      gqlContext.userId = decoded.userId || decoded.sub;
      gqlContext.user = decoded;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unauthorized: Invalid token - ${message}`);
    }
  }
}
