import { Module } from '@nestjs/common';
import { ProductManagmentController } from './product-managment.controller';
import { ProductManagmentService } from './product-managment.service';

@Module({
  controllers: [ProductManagmentController],
  providers: [ProductManagmentService]
})
export class ProductManagmentModule {}
