import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PartnerAuthService } from './partner-auth.service';
import { PartnerAuthGuard, RequestWithPartner } from 'src/guards/partner-auth.guard';

@Controller('partner-auth')
export class PartnerAuthController {
  constructor(private readonly authService: PartnerAuthService) {}

  @Post('register')
  async register(
    @Body() body: { name: string; email: string; phone?: string; password: string },
  ) {
    return await this.authService.registerPartner(
      body.name,
      body.email,
      body.phone as any,
      body.password,
    );
  }

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { partner, token } = await this.authService.login(body);

    res.cookie('AccessPartnerToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { message: 'Login successful', partner };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('AccessPartnerToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  @UseGuards(PartnerAuthGuard)
  async profile(@Req() req: RequestWithPartner) {
    return await this.authService.getProfile(req.partner.id);
  }

  @Put('edit-profile')
  @UseGuards(PartnerAuthGuard)
  async editProfile(@Req() req: RequestWithPartner, @Body() body: any) {
    return await this.authService.editProfile(req.partner.id, body);
  }

  @Patch('change-password')
  @UseGuards(PartnerAuthGuard)
  async changePassword(
    @Req() req: RequestWithPartner,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return await this.authService.changePassword(
      req.partner.id,
      body.currentPassword,
      body.newPassword,
    );
  }
}
