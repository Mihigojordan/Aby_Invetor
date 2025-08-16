import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class AdminService {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtServices: JwtService,
    private readonly activityService: ActivityManagementService
  ) {}

  async findAdminById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('admin id is required');
      }
      const admin = await this.prisma.admin.findUnique({
        where: {
          id: id,
        },
      });
      return admin;
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  async findAdminByEmail(email: string) {
    try {
      if (!email) {
        throw new BadRequestException('admin id is required');
      }
      const admin = await this.prisma.admin.findUnique({
        where: {
          adminEmail: email,
        },
      });

      return admin;
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  async registerAdmin(data: {
    adminName: string;
    adminEmail: string;
    password: string;
  }) {
    try {
      const { adminEmail, adminName, password } = data;

      if (!adminEmail || !adminName || !password) {
        throw new BadRequestException('all input are required');
      }

      if (!this.emailRegex.test(adminEmail)) {
        throw new BadRequestException('Invalid email format');
      }
      const existing = await this.findAdminByEmail(adminEmail);
      if (existing) {
        throw new BadRequestException('Admin already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = await this.prisma.admin.create({
        data: {
          adminEmail: adminEmail,
          adminName: adminName,
          password: hashedPassword,
        },
      });

      return { message: 'Admin registered successfully', adminId: newAdmin.id };
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  async adminLogin(data: { adminEmail: string; password: string }) {
    try {
      const { adminEmail, password } = data;
     

      const admin = await this.findAdminByEmail(adminEmail);

      if (!admin) throw new UnauthorizedException('this admin doesnt exist');

      const isMatch = await bcrypt.compare(password, admin.password ?? '');

      if (!isMatch) throw new UnauthorizedException('Invalid credentials');

      const token = this.jwtServices.sign({ id: admin.id })

      // Track the login activity
      await this.activityService.createActivity({
        activityName: 'Admin Login',
        description: `${admin.adminName} logged in successfully`,
        adminId: admin.id,
      });

      return token;
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  async lockAdmin(id: string) {
    try {
      const admin = await this.findAdminById(id);
      if (!admin) {
        throw new NotFoundException('admin not found');
      }
      const adminLocked = await this.prisma.admin.update({
        where: { id },
        data: { isLocked: true },
      });
      return { message: `Admin ${adminLocked.adminEmail} has been locked.` };
    } catch (error) {
      console.error('error finding admin', error);
      throw new Error(error.message);
    }
  }

  // functiom for unlocking admin
  async adminUnlocking(id: string, body: { password: string }) {
    try {
      // validate the hostId
      if (!id) {
        throw new BadRequestException('admin id is required');
      }
      // check and validate the password
      if (!body.password || body.password.length < 6) {
        throw new BadRequestException(
          'password is required and must be at least 6 characters long',
        );
      }
      // check if the host exists
      const admin = await this.findAdminById(id);
      // if the host does not exist, throw an error
      if (!admin) {
        throw new BadRequestException('admin not found');
      }
      // if the host is not locked, throw an error
      if (!admin.isLocked) {
        throw new BadRequestException('admin is not locked');
      }
      // compare the password with the hashed password
      const isPasswordValid = await bcrypt.compare(
        body.password,
        String(admin.password),
      );
      if (!isPasswordValid) {
        throw new BadRequestException('Invalid password');
      }
      // unlock the host
      const unlockedAdmin = await this.prisma.admin.update({
        where: { id: id },
        data: { isLocked: false },
      });
      return {
        message: 'host unlocked successfully',
      };
    } catch (error) {
      console.error('Error unlocking host:', error);
      throw new Error(error.message);
    }
  }

  async logout(res: Response, adminId: string) {
    try {
      if (!adminId) {
        throw new BadRequestException('admin id is required');
      }
      const admin = await this.findAdminById(adminId);
      if (!admin) {
        throw new NotFoundException('admin not found');
      }

      if (admin.isLocked) {
        await this.prisma.admin.update({
          where: {
            id: adminId,
          },
          data: {
            isLocked: false,
          },
        });
      }

      res.clearCookie('AccessHostToken', {
        httpOnly: true,
        secure: true, // <-- Required for SameSite=None in production
        sameSite: 'none', // <-- Required for cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

       // Track the login activity
      await this.activityService.createActivity({
        activityName: 'Admin Logout',
        description: `${admin.adminName} logged out successfully`,
        adminId: admin.id,
      });

      return { message: 'logged out successfully' };
    } catch (error) {
      console.log('error logging out:', error);
      throw new Error(error.message);
    }
  }
}
