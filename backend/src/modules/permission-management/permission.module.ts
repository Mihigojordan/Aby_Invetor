import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { GlobalSocketGateway } from 'src/global/socket/socket.gateway';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService, GlobalSocketGateway],
  exports: [PermissionService],
})
export class PermissionModule {}
