import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs'
import { Response } from 'express';
import { ActivityManagementService } from 'src/modules/activity-managament/activity.service';

@Injectable()
export class EmployeeAuthService {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtServices: JwtService,
    private readonly activityService: ActivityManagementService
  ) {}


  async EmployeeLogin(data: { email: string; password: string }) {
    try {
      const { email, password } = data;

      const employee = await this.prisma.employee.findFirst({
        where: {
            email: email
        }
      });

      if (!employee) throw new UnauthorizedException('this admin doesnt exist');

      const isMatch = await bcrypt.compare(password, employee.password ?? '');

      if (!isMatch) throw new UnauthorizedException('Invalid credentials');

      const token = this.jwtServices.sign({ id: employee.id });

       // Track the login activity
      await this.activityService.createActivity({
        activityName: 'employee Login',
        description: `${employee.firstname} logged in successfully`,
        employeeId: employee.id,
      });

      return token;
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  async lockEmployee(id: string) {
    try {
      const employee = await this.prisma.employee.findUnique({ where: { id } });
      if (!employee) {
        throw new NotFoundException('admin not found');
      }
      const employeeLocked = await this.prisma.employee.update({
        where: { id },
        data: { isLocked: true },
      });
      return { message: `Admin ${employeeLocked.email} has been locked.` };
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  // functiom for unlocking admin
  async EmployeeUnlocking(id: string, body: { password: string }) {
    try {
      // validate the hostId
      if (!id) {
        throw new BadRequestException(' id is required');
      }
      // check and validate the password
      if (!body.password || body.password.length < 6) {
        throw new BadRequestException(
          'password is required and must be at least 6 characters long',
        );
      }
      // check if the host exists
      const employee = await this.prisma.employee.findUnique({ where: { id} });
      // if the host does not exist, throw an error
      if (!employee) {
        throw new BadRequestException('employee not found');
      }
      // if the host is not locked, throw an error
      if (!employee.isLocked) {
        throw new BadRequestException('employee  is not locked');
      }
      // compare the password with the hashed password
      const isPasswordValid = await bcrypt.compare(
        body.password,
        String(employee.password),
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid password');
      }
      // unlock the host
      const unlockedEmployee = await this.prisma.employee.update({
        where: { id: id },
        data: { isLocked: false },
      });
      return {
        message: 'employee unlocked successfully',
      };
    } catch (error) {
      console.error('Error unlocking host:', error);
      throw new Error(error.message);
    }
  }

  async logout(res: Response, id: string) {
    try {
      if (!id) {
        throw new BadRequestException('admin id is required');
      }
      const employee = await this.prisma.employee.findUnique({ where: { id } });
      if (!employee) {
        throw new NotFoundException('admin not found');
      }

      if (employee.isLocked) {
        await this.prisma.admin.update({
          where: {
            id: id,
          },
          data: {
            isLocked: false,
          },
        });
      }

      res.clearCookie('AccessEmployeeToken', {
        httpOnly: true,
        secure: true, // <-- Required for SameSite=None in production
        sameSite: 'none', // <-- Required for cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Track the login activity
      await this.activityService.createActivity({
        activityName: 'employee Logout',
        description: `${employee.firstname} logged out successfully`,
        employeeId: employee.id,
      });

      return { message: 'logged out successfully' };
    } catch (error) {
      console.log('error logging out:', error);
      throw new Error(error.message);
    }
  }
}
