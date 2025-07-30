import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
  @UseInterceptors(
    FileFieldsInterceptor(productFileFields, productUploadConfig),
  )
  async create(
    @UploadedFiles() files: { imageurls?: Express.Multer.File[] },
    @Body() body,
  ) {
    return this.productService.createProduct({
      ...body,
      description: body.description,
      imageurls: files.imageurls,
    });
  }

  @Get('all')
  async findAll() {
    return this.productService.getAllProducts();
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
      description: body.description ,
      imageurls: files.imageurls,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }
}
