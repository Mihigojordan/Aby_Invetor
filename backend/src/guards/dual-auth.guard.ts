import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface RequestWithAuth extends Request {
  admin?: any;
  partner?: any;
  employee?: any;
}


@Injectable()
export class DualAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAuth>();

    let authenticated = false;

    // ────────────────────────────────
    // 1️⃣ ADMIN TOKEN
    // ────────────────────────────────
    const adminToken = req.cookies?.['AccessAdminToken'];
    if (adminToken) {
      try {
        const decoded = await this.jwtService.verifyAsync(adminToken, {
          secret: process.env.Jwt_SECRET_KEY || 'secretkey',
        });
        req.admin = decoded;
        authenticated = true;
      } catch (err) {
        console.log('❌ Invalid admin token');
      }
    }

    // ────────────────────────────────
    // 2️⃣ PARTNER TOKEN
    // ────────────────────────────────
    const partnerToken = req.cookies?.['AccessPartnerToken'];
    if (!authenticated && partnerToken) {
      try {
        const decoded = await this.jwtService.verifyAsync(partnerToken, {
          secret: process.env.Jwt_SECRET_KEY || 'secretkey',
        });
        req.partner = decoded;
        authenticated = true;
      } catch (err) {
        console.log('❌ Invalid partner token');
      }
    }

    // ────────────────────────────────
    // 3️⃣ EMPLOYEE TOKEN
    // ────────────────────────────────
    const employeeToken = req.cookies?.['AccessEmployeeToken'];
    if (!authenticated && employeeToken) {
      try {
        const decoded = await this.jwtService.verifyAsync(employeeToken, {
          secret: process.env.Jwt_SECRET_KEY || 'secretkey',
        });
        req.employee = decoded;
        authenticated = true;
      } catch (err) {
        console.log('❌ Invalid employee token');
      }
    }

    // ────────────────────────────────
    // 4️⃣ FINAL CHECK
    // ────────────────────────────────
    if (!authenticated) {
      throw new UnauthorizedException('Not authenticated');
    }

    return true;
  }
}
