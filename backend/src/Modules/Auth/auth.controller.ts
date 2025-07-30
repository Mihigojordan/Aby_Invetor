import { Controller, Post, Get, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}


  @Post()
  async createUser(@Body() data: { name: string; email: string }) {
    console.log('Received user data:', data);  // ✅ Debug incoming payload
    return this.authService.createUser(data);
  }
  @Get()
  getAll() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.authService.getUsers();
  }
}
