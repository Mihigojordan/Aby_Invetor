import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtModule } from '@nestjs/jwt';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, ActivityManagementService ],
  imports: [
    JwtModule.register({
      secret: process.env.Jwt_SECRET_KEY,
      global: true,
      signOptions: {
        expiresIn: "7d"
      }
    })
  ]
})
export class AdminModule {}
