import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  productFileFields,
  productUploadConfig,
} from 'src/common/utils/file-upload.utils';
import { ProductManagmentService } from './product-managment.service';

@Controller('product')
export class ProductManagmentController {
  constructor(private readonly productService: ProductManagmentService) {}

  @Post('create')
  @UseInterceptors(FileFieldsInterceptor(productFileFields, productUploadConfig))
  async create(
    @UploadedFiles() files: { imageurls?: Express.Multer.File[] },
    @Body() body,
  ) {
    return this.productService.createProduct({
      ...body,
      description: body.description,
      imageurls: files.imageurls,
      createdAt: new Date(),
    });
  }

  @Get('all')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 10;
    return this.productService.getAllProductsPaginated(pageNumber, pageLimit);
  }

  @Get('getone/:id')
  async findOne(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Put('update/:id')
  @UseInterceptors(FileFieldsInterceptor(productFileFields, productUploadConfig))
  async update(
    @Param('id') id: string,
    @UploadedFiles() files: { imageurls?: Express.Multer.File[] },
    @Body() body,
  ) {
    return this.productService.updateProduct(id, {
      ...body,
      description: body.description,
      imageurls: files.imageurls,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
