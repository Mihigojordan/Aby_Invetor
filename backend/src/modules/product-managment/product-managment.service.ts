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
    description?: string; // HTML string from frontend
    imageurls?: Express.Multer.File[];
  }) {
    try {
      const { productName, brand, categoryId, description, imageurls } = data;

      const imageUrls =
        imageurls?.map((file) => `/uploads/product_images/${file.filename}`) ||
        [];

      // Convert description HTML string to JSON object
      const descriptionJson = description ? { details: description } : {details: ''};
      console.log(descriptionJson);
      

      const product = await this.prisma.product.create({
        data: {
          productName,
          brand,
          description: descriptionJson, // Store as JSON object
          imageUrls,
          category: {
            connect: {
              id: categoryId,
            },
          },
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
      description?: any; // HTML string from frontend
      keepImages?: any;
      imageurls?: Express.Multer.File[];
    },
  ) {
    const existing = await this.getProductById(id);

    // ✅ Validate categoryId if provided
    if (data.categoryId?.trim()) {
      const categoryExists = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestException(
          'Invalid categoryId: category does not exist',
        );
      }
    }

    const keepImages = JSON.parse(data?.keepImages) ;
    console.log('keepimages', keepImages);
    const newImages = data.imageurls?.map(
        (file) => `/uploads/product_images/${file.filename}`,
      ) ?? [];

      console.log('keeping images',keepImages.length );
      console.log('new images',newImages );
      

    // ✅ Ensure max 4 images
    const totalImages = keepImages.length + newImages.length;
    if (totalImages > 4) {
      throw new BadRequestException(
        'Maximum 4 images allowed (existing + new)',
      );
    }

    // ✅ Delete images not in keepImages
    const removedImages = (existing.imageUrls as string[] || []).filter(
      (url) => !keepImages.includes(url),
    );

    for (const url of removedImages) {
      deleteFile(String(url));
    }

    const imageUrls = [...keepImages, ...newImages];

    // Convert description HTML string to JSON object if provided
    const descriptionJson = data.description 
      ? { details: data.description } 
      : undefined;

      console.log('sss ssf :',descriptionJson);
      

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productName: data.productName,
        brand: data.brand,
        categoryId: data.categoryId,
        description: descriptionJson, // Store as JSON object
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