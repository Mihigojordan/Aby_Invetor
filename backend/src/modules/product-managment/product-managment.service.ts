import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { deleteFile } from 'src/common/utils/file-upload.utils';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';

@Injectable()
export class ProductManagmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
  ) {}

  async createProduct(data: {
    productName?: string;
    brand?: string;
    categoryId: string;
    description?; // HTML string from frontend
    adminId?: string;
    employeeId?: string;
    imageurls?: Express.Multer.File[];
    createdAt: Date;
  }) {
    try {
      const {
        productName,
        brand,
        categoryId,
        description,
        imageurls,
        createdAt,
      } = data;

      console.log(data)

      const imageUrls =
        imageurls?.map((file) => `/uploads/product_images/${file.filename}`) ||
        [];

      // Convert description HTML string to JSON object
      const descriptionJson = description
        ? { details: description }
        : { details: '' };
      console.log(descriptionJson);

      // Resolve admin/employee IDs — fall back to null if the referenced record
      // no longer exists (handles stale IDs from offline-created products)
      const resolvedAdminId = data.adminId
        ? ((await this.prisma.admin.findUnique({ where: { id: String(data.adminId) }, select: { id: true } }))?.id ?? null)
        : null;
      const resolvedEmployeeId = data.employeeId
        ? ((await this.prisma.employee.findUnique({ where: { id: String(data.employeeId) }, select: { id: true } }))?.id ?? null)
        : null;

      const product = await this.prisma.product.create({
        data: {
          productName,
          brand,
          adminId: resolvedAdminId,
          description: descriptionJson,
          imageUrls,
          employeeId: resolvedEmployeeId,
          categoryId: categoryId,
          createdAt: createdAt ? createdAt : new Date().toISOString(),
        },
      });

      if (resolvedAdminId) {
        const admin = await this.prisma.admin.findUnique({ where: { id: resolvedAdminId } });
        if (admin) {
          await this.activityService.createActivity({
            activityName: 'Product Created',
            description: `${admin.adminName} created product: ${product.productName}`,
            adminId: admin.id,
          });
        }
      }
      if (resolvedEmployeeId) {
        const employee = await this.prisma.employee.findUnique({ where: { id: resolvedEmployeeId } });
        if (employee) {
          await this.activityService.createActivity({
            activityName: 'Product Created',
            description: `${employee.firstname} created product: ${product.productName}`,
            employeeId: employee.id,
          });
        }
      }

      return {
        message: 'Product created successfully',
        product,
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw new BadRequestException(error.message);
    }
  }

  async getAllProducts(updatedAfter?: string, take = 200, skip = 0) {
    const where: any = {};
    if (updatedAfter) {
      where.updatedAt = { gte: new Date(updatedAfter) };
    }
    const records = await this.prisma.product.findMany({
      where,
      include: { category: true },
      take,
      skip,
      orderBy: { updatedAt: 'asc' },
    });
    return { data: records, deletedIds: [] };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { 
        category: true,
        stockIn:{
          include:{
            employee:true,
            product:true,
            admin:true,
            stockout:true
          }
        },
        admin:true,
        employee:true
       },
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
      adminId?: string;
      employeeId?: string;
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

    // Parse keepImages safely
    let keepImages:string[] = [];
    try {
      keepImages = data?.keepImages ? JSON.parse(data.keepImages) : [];
      if (!Array.isArray(keepImages)) {
        throw new Error('Not an array');
      }
    } catch (error) {
      throw new BadRequestException(
        'Invalid keepImages format - must be a valid JSON array',
      );
    }

    // keepImages = JSON.parse(data?.keepImages);
    console.log('keepimages', keepImages);
    const newImages =
      data.imageurls?.map(
        (file) => `/uploads/product_images/${file.filename}`,
      ) ?? [];

    console.log('keeping images', keepImages.length);
    console.log('new images', newImages);

    // ✅ Ensure max 4 images
    const totalImages = keepImages.length + newImages.length;
    if (totalImages > 4) {
      throw new BadRequestException(
        'Maximum 4 images allowed (existing + new)',
      );
    }

    // ✅ Delete images not in keepImages
    const removedImages = ((existing.imageUrls as string[]) || []).filter(
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

    console.log('sss ssf :', descriptionJson);

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

    // 🔍 Log activity
    if ('adminId' in data && data.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin)
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Product Updated',
        description: `${admin.adminName} updated product: ${updated.productName}`,
        adminId: admin.id,
      });
    }

    if ('employeeId' in data && data.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
      });
      if (!employee)
        throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Product Updated',
        description: `${employee.firstname} updated product: ${updated.productName}`,
        employeeId: employee.id,
      });
    }

    return {
      message: 'Product updated successfully',
      product: updated,
    };
  }

  async deleteProduct(
    id: string,
    data?: { adminId?: string; employeeId?: string },
  ) {
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

    // 🔍 Log activity
    if (data?.adminId) {
      const admin = await this.prisma.admin.findUnique({
        where: { id: data.adminId },
      });
      if (!admin)
        throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Product Deleted',
        description: `${admin.adminName} deleted product: ${product.productName}`,
        adminId: admin.id,
      });
    }

    if (data?.employeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
      });
      if (!employee)
        throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);

      await this.activityService.createActivity({
        activityName: 'Product Deleted',
        description: `${employee.firstname} deleted product: ${product.productName}`,
        employeeId: employee.id,
      });
    }

    return { message: 'Product deleted successfully' };
  }
}