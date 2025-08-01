import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { EmployeeAuthService } from './auth.service';
import { Response } from 'express';
import { RequestWithEmployee } from 'src/common/interfaces/employee.interface';
import { EmployeeManagmentService } from '../employee-managment.service';
import { EmployeeJwtAuthGuard } from 'src/guards/employeeGuard.guard';

@Controller('employee/auth')
export class EmployeeAuthController {
  constructor(
    private readonly authService: EmployeeAuthService,
    private readonly employeeService: EmployeeManagmentService,
  ) {}
  @Post('login')
  async login(@Body() req, @Res() res: Response) {
    try {
      const token = await this.authService.EmployeeLogin(req); // Remove res parameter

      if (!token) {
        console.log('error getting token');
      }

      res.cookie('AccessEmployeeToken', token, {
        httpOnly: true,
        secure: true, // Set to true in production
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        message: 'employee logged in successfully',
        authenticated: true,
      });
    } catch (error) {
      console.log('error registering admin', error);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('logout')
  @UseGuards(EmployeeJwtAuthGuard)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithEmployee,
  ) {
    const adminId = req.employee?.id as string;
    try {
      return await this.authService.logout(res, adminId);
    } catch (error) {
      console.error('Error logging out client:', error);
      throw new Error(error.message);
    }
  }

  @Get('profile')
  @UseGuards(EmployeeJwtAuthGuard)
  async getAdminProfile(@Req() req: RequestWithEmployee) {
    const id = req.employee?.id as string;
    try {
      return await this.employeeService.findEmployeeById(id);
    } catch (error) {
      console.error('Error logging out admin:', error);
      throw new Error(error.message);
    }
  }

  //this profile is for locking host account
  @Post('lock')
  @UseGuards(EmployeeJwtAuthGuard)
  async HostLocking(@Req() req: RequestWithEmployee) {
    const id = req.employee?.id as string;
    if (!id) {
      throw new Error('Host ID not found in request');
    }
    try {
      return await this.authService.lockEmployee(id);
    } catch (error) {
      console.log('error locking admin', error);
      throw new Error(error.message);
    }
  }

  //this endpoint is for host to unlock his account
  @Post('unlock')
  @UseGuards(EmployeeJwtAuthGuard)
  async adminUnlocking(@Req() req: RequestWithEmployee, @Body() datas) {
    const id = req.employee?.id as string;
    if (!id) {
      throw new Error('Host ID not found in request');
    }
    try {
      return await this.authService.EmployeeUnlocking(id, datas);
    } catch (error) {
      console.log('error editing host', error);
      throw new HttpException(
        error.message,
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
