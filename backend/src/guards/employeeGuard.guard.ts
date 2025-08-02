import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RequestWithEmployee } from 'src/common/interfaces/employee.interface';

@Injectable()
export class EmployeeJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtServices: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithEmployee>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const token = this.extractTokenFromCookies(request);

    console.log("the employees token represented here is:", token);
    if (!token) {
      throw new UnauthorizedException('not authenticated');
    }
    try {
      const decodedHost = await this.jwtServices.verifyAsync(token, {
        secret: process.env.Jwt_SECRET_KEY  || 'secretkey', // Ensure JWT_SECRET is securely stored
      });

      request.employee = decodedHost;

      return true;
    } catch (error) {
      console.log('error on hostguard:', error);
      throw new UnauthorizedException('invalid or expired token');
    }
  }

  private extractTokenFromCookies(req: Request): string | undefined {
    // Extract the token from the cookies
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return req.cookies?.['AccessEmployeeToken'];
  }
}
