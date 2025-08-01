import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RequestWithAdmin } from '../common/interfaces/admin.interface';

@Injectable()
export class AdminJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtServices: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const adminToken = this.extractTokenFromCookies(request);

    console.log("the admin's token represented here is:", adminToken);
    if (!adminToken) {
      throw new UnauthorizedException('not authenticated');
    }
    try {
      const decodedHost = await this.jwtServices.verifyAsync(adminToken, {
        secret: process.env.Jwt_SECRET_KEY  || 'secretkey', // Ensure JWT_SECRET is securely stored
      });

      request.admin = decodedHost;

      return true;
    } catch (error) {
      console.log('error on hostguard:', error);
      throw new UnauthorizedException('invalid or expired token');
    }
  }

  private extractTokenFromCookies(req: Request): string | undefined {
    // Extract the token from the cookies
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return req.cookies?.['AccessAdminToken'];
  }
}
