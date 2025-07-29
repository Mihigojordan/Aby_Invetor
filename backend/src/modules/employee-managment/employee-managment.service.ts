import { BadRequestException, Injectable } from '@nestjs/common';
import { isPhoneValid, isValidEmail } from 'src/common/utils/validation.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmployeeManagmentService {
  constructor(private readonly prismaService: PrismaService) {}

  async registerEmployee(data: {
    firstname: string;
    lastname: string;
    email: string;
    phoneNumber: string;
    address: string;
  }) {
    try {
      const { firstname, lastname, email, phoneNumber, address } = data;
      if (!email || !phoneNumber) {
        throw new BadRequestException('email and phone number are required');
      }
      if (!isValidEmail(email)) {
        throw new BadRequestException('email is not valid');
      }
      if (!isPhoneValid(phoneNumber)) {
        throw new BadRequestException('phone number is not valid');
      }

      const existingEmployee = await this.findEmployeeByEmail(email);
      if (existingEmployee) {
        throw new BadRequestException('employee already exists');
      }

      const createEmployee = await this.prismaService.employee.create({
        data: {
          email: email,
          phoneNumber: phoneNumber,
          firstname: firstname,
          lastname: lastname,
          address: address,
        },
        include:{
           tasks: true
        }
      });
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
            tasks: true
        }
      });
      return employees;
    } catch (error) {
      console.error('error getting   employees', error);
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
