import { BadRequestException, Injectable } from '@nestjs/common';
import { generateSixDigitNumber } from 'src/common/utils/generate-sku.util';
import { isPhoneValid, isValidEmail } from 'src/common/utils/validation.util';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcyrpt from 'bcryptjs';
import { EmailService } from '../../global/email/email.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class EmployeeManagmentService {
  constructor(private readonly prismaService: PrismaService, private readonly emailService:EmailService, private readonly activityService:ActivityManagementService ) {}

  async registerEmployee(data: {
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
    address: string;
    adminId?: string;
    profileImg?: Express.Multer.File[];
    identityCard?: Express.Multer.File[];
    cv?: Express.Multer.File[];
  }) {
    try {
      const { firstname, lastname, email, phoneNumber, address } = data;

      const profileImageFile = data.profileImg?.[0];
      const identityCardFile = data.identityCard?.[0];
      const cvFile = data.cv?.[0];

      if (!email || !phoneNumber) {
        throw new BadRequestException('email and phone number are required');
      }
      if (!isValidEmail(email)) {
        throw new BadRequestException('email is not valid');
      }
      const existingEmployee = await this.findEmployeeByEmail(email);
      if (existingEmployee) {
        throw new BadRequestException('employee already exists');
      }

      const password = generateSixDigitNumber();
      console.log('password generated:', password)

      const hashedPassword = await bcyrpt.hash(String(password), 10);

      // generate file paths
      const profileImageUrl = `/uploads/profile_images/${profileImageFile?.filename}`;
      const identityCardUrl = `/uploads/identity_files_image/${identityCardFile?.filename}`;
      const cvUrl = `/uploads/cv_files/${cvFile?.filename}`;

      const createEmployee = await this.prismaService.employee.create({
        data: {
          email: email,
          phoneNumber: phoneNumber,
          firstname: firstname,
          lastname: lastname,
          address: address,
          password:hashedPassword,
          profileImg: profileImageUrl,
          cv: cvUrl,
          identityCard: identityCardUrl
        },
        include: {
          tasks: true,
        },
      });
      await this.emailService.sendEmail(String(email),'registration info',`
      <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to abyInvento</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
      }

      .email-container {
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        border-radius: 8px;
        padding: 30px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      h2 {
        color: #333333;
      }

      p {
        font-size: 16px;
        color: #555555;
        line-height: 1.6;
      }

      .footer {
        margin-top: 30px;
        font-size: 13px;
        color: #999999;
      }

      .btn {
        display: inline-block;
        margin-top: 15px;
        padding: 10px 20px;
        background-color: #007bff;
        color: #fff;
        text-decoration: none;
        border-radius: 4px;
      }

      .btn:hover {
        background-color: #0056b3;
      }
    </style>
  </head>

  <body>
    <div class="email-container">
      <h2>Welcome to AbyInvento!</h2>
      <p>Hi <strong>${firstname}</strong>,</p>
      <p>
        Your account has been created successfully by the admin. Below are your login details:
      </p>

      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>

      <p>
        Please log in and update your password after your first login for security
        purposes.
      </p>

      <a href="https://abyinventory.com/auth/employee/login" class="btn">Login Now</a>

      <p>Welcome aboard! If you have any questions, feel free to reach out.</p>

      <div class="footer">
        &copy; ${new Date().getFullYear()} Aby_invento. All rights reserved.
      </div>
    </div>
  </body>
</html>

      `)

      // ✅ Log admin activity
    if (data.adminId) {
      const admin = await this.prismaService.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin) {
        throw new BadRequestException('admin not found');
      }

      await this.activityService.createActivity({
        activityName: 'Employee Registered',
        description: `${admin.adminName} registered employee: ${firstname} ${lastname}`,
        adminId: admin.id,
      });
    }
      return {
        message: 'employee registered succefully',
        createEmployee,
      };
    } catch (error) {
      console.error('error registering a employee', error);
      throw new Error(error.message);
    }
  }

  async findEmployeeByEmail(email: string) {
    try {
      if (!email) {
        throw new BadRequestException('email is required');
      }
      const employee = await this.prismaService.employee.findUnique({
        where: {
          email: email,
        },
      });

      return employee;
    } catch (error) {
      console.error('error getting  employee by id', error);
      throw new Error(error.message);
    }
  }
  async findEmployeeById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('email is required');
      }
      const employee = await this.prismaService.employee.findUnique({
        where: {
          id: id,
        },
        include:{
          tasks: true
        }
      });

      return employee;
    } catch (error) {
      console.error('error getting   employee by id', error);
      throw new Error(error.message);
    }
  }

  async getAllEmployee() {
    try {
      const employees = await this.prismaService.employee.findMany({
        include: {
          tasks: true,
        },
      });
      return employees;
    } catch (error) {
      console.error('error getting   employees', error);
      throw new Error(error.message);
    }
  }

  async updateEmployee(
    id: string,
    data: {
      firstname?: string;
      lastname?: string;
      email?: string;
      phoneNumber?: string;
      address?: string;
      password?: string;
      newPassword?: string;
      profileImg?: Express.Multer.File[];
      identityCard?: Express.Multer.File[];
      cv?: Express.Multer.File[];
    },
  ) {
    try {
      const profileImageFile = data.profileImg?.[0];
      const identityCardFile = data.identityCard?.[0];
      const cvFile = data.cv?.[0];
      if (!id) {
        throw new BadRequestException('Employee ID is required');
      }

      const existingEmployee = await this.findEmployeeById(id);
      if (!existingEmployee) {
        throw new BadRequestException('Employee not found');
      }

      // Optional: Validate email/phone if being updated
      if (data.email && !isValidEmail(data.email)) {
        throw new BadRequestException('Invalid email format');
      }

      if (data.phoneNumber && !isPhoneValid(data.phoneNumber)) {
        throw new BadRequestException('Invalid phone number format');
      }

      let hashedPass;
      if (data.password && data.newPassword) {
        if (typeof existingEmployee.password !== 'string') {
          throw new BadRequestException('Employee password is not set');
        }
        const verifyPass = bcyrpt.compare(data.password, existingEmployee.password);
        if (!verifyPass) {
          throw new BadRequestException('password mismatch')
        }
        hashedPass = await bcyrpt.hash(data.newPassword, 10)
      }
      // generate file paths
      const profileImageUrl = `/uploads/profile_images/${profileImageFile?.filename}`;
      const identityCardUrl = `/uploads/identity_files_image/${identityCardFile?.filename}`;
      const cvUrl = `/uploads/cv_files/${cvFile?.filename}`;

      const updatedEmployee = await this.prismaService.employee.update({
        where: { id },
        data: {
          password: hashedPass ?? existingEmployee.password,
          profileImg: profileImageFile?.filename ? profileImageUrl  : existingEmployee.profileImg,
          firstname: data.firstname ?? existingEmployee.firstname,
          lastname: data.lastname ?? existingEmployee.lastname,
          email: data.email ?? existingEmployee.email,
          phoneNumber: data.phoneNumber ?? existingEmployee.phoneNumber,
          cv: cvFile?.filename ? cvUrl : existingEmployee.cv,
          identityCard: identityCardFile?.filename ? identityCardUrl : existingEmployee.identityCard,
          address: data.address ?? existingEmployee.address
        },
      });

      return {
        message: 'Employee updated successfully',
        employee: updatedEmployee,
      };
    } catch (error) {
      console.error('Error updating employee:', error);
      throw new Error(error.message);
    }
  }

  async deleteEmployee(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Employee ID is required');
      }

      const employee = await this.findEmployeeById(id);
      if (!employee) {
        throw new BadRequestException('Employee not found');
      }

      await this.prismaService.employee.delete({
        where: { id },
      });

      return {
        message: 'Employee deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw new Error(error.message);
    }
  }

  async assignTasks(data: { employeeId: string; assignedTasks: string[] }) {
    try {
      // if (!data.assignedTasks || data.assignedTasks.length === 0) {
      //   throw new Error('No tasks provided for assignment');
      // }

      const updatedEmployee = await this.prismaService.employee.update({
        where: { id: data.employeeId },
        data: {
          tasks: {
            set: data.assignedTasks.map((taskId) => ({ id: taskId })),
          },
        },
        include: {
          tasks: true,
        },
      });

      return {
        message: 'Tasks assigned successfully',
        employee: updatedEmployee,
      };
    } catch (error) {
      console.error('error getting   employees', error);
      throw new Error(error.message);
    }
  }
}
