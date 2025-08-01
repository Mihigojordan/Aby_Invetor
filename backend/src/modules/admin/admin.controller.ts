import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Response } from 'express';
import { AdminJwtAuthGuard } from 'src/guards/adminGuard.guard';
import { RequestWithAdmin } from 'src/common/interfaces/admin.interface';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminServices: AdminService) {}

  @Post('register')
  async registerByClient(@Body() req) {
    try {
      return await this.adminServices.registerAdmin(req);
    } catch (error) {
      console.log('error registering admin', error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Post('login')
  async loginByClient(@Body() req, @Res() res: Response) {
    try {
      const token = await this.adminServices.adminLogin(req); // Remove res parameter

      if (!token) {
        console.log('error getting token');
      }

      res.cookie('AccessAdminToken', token, {
        httpOnly: true,
        secure: true, // Set to true in production
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        message: 'client logged in successfully',
        authenticated: true,
      });
    } catch (error) {
      console.log('error registering admin', error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  async logoutByHost(
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithAdmin,
  ) {
    const adminId = req.admin?.id as string;
    try {
      return await this.adminServices.logout(res, adminId);
    } catch (error) {
      console.error('Error logging out client:', error);
      throw new HttpException(error.message, error.status);
    }
  }

  @Get('profile')
  @UseGuards(AdminJwtAuthGuard)
  async getAdminProfile(@Req() req: RequestWithAdmin) {
    const adminId = req.admin?.id as string;
    try {
      return await this.adminServices.findAdminById(adminId);
    } catch (error) {
      console.error('Error logging out admin:', error);
      throw new HttpException(error.message, error.status);
    }
  }


   //this profile is for locking host account
  @Post('lock')
  @UseGuards(AdminJwtAuthGuard)
  async HostLocking(@Req() req: RequestWithAdmin) {
    const adminId = req.admin?.id as string;
    if (!adminId) {
      throw new Error('Host ID not found in request');
    }
    try {
      return await this.adminServices.lockAdmin(adminId);
    } catch (error) {
      console.log('error locking admin', error);
      throw new HttpException(error.message, error.status);
    }
  }

  //this endpoint is for host to unlock his account
  @Post('unlock')
  @UseGuards(AdminJwtAuthGuard)
  async adminUnlocking(@Req() req: RequestWithAdmin, @Body() datas) {
   const adminId = req.admin?.id as string;
    if (!adminId) {
      throw new Error('Host ID not found in request');
    }
    try {
      return await this.adminServices.adminUnlocking(adminId, datas);
    } catch (error) {
      console.log('error editing host', error);
      throw new HttpException(error.message, error.status);
    }
  }
}
