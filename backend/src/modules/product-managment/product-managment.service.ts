import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { deleteFile } from 'src/common/utils/file-upload.utils';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductManagmentService {
  constructor(private readonly prisma: PrismaService) {}

  async createProduct(data: {
    productName?: string;
    brand?: string;
    categoryId?: string;
    description?: any;
    imageurls?: Express.Multer.File[];
  }) {
    try {
      const { productName, brand, categoryId, description, imageurls } = data;

      const imageUrls =
        imageurls?.map((file) => `/uploads/product_images/${file.filename}`) ||
        [];

      const product = await this.prisma.product.create({
        data: {
          productName,
          brand,
          categoryId,
          description,
          imageUrls,
        },
      });

      return {
        message: 'Product created successfully',
        product,
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw new BadRequestException(error.message);
    }
  }

  async getAllProducts() {
    return this.prisma.product.findMany({
      include: { category: true },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async updateProduct(
    id: string,
    data: {
      productName?: string;
      brand?: string;
      categoryId?: string;
      description?: any;
      imageurls?: Express.Multer.File[];
    },
  ) {
    const existing = await this.getProductById(id);

    // Prepare new imageUrls array (keep old + add new images)
    let imageUrls = existing.imageUrls || [];

    if (data.imageurls && data.imageurls.length > 0) {
      const newImages = data.imageurls.map((file) => `/uploads/product_images/${file.filename}`);

    //   imageUrls = [...imageUrls, ...newImages];
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productName: data.productName,
        brand: data.brand,
        categoryId: data.categoryId,
        description: data.description,
        imageUrls,
      },
    });

    return {
      message: 'Product updated successfully',
      product: updated,
    };
  }

  async deleteProduct(id: string) {
    const product = await this.getProductById(id);

    // Delete all image files from disk
    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      for (const img of product.imageUrls) {
        if (img) {
          try {
            deleteFile(String(img));
          } catch (err) {
            console.error('Failed to delete image:', err);
          }
        }
      }
    }

    await this.prisma.product.delete({ where: { id } });

    return { message: 'Product deleted successfully' };
  }
}
