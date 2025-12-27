import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityManagementService } from '../activity-managament/activity.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { deleteFile } from 'src/common/utils/file-upload.utils';

@Injectable()
export class ProductManagmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityManagementService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ================= CREATE =================
  async createProduct(data: {
    productName?: string;
    brand?: string;
    categoryId: string;
    description?: string;
    adminId?: string;
    employeeId?: string;
    imageurls?: Express.Multer.File[];
    createdAt: Date;
  }) {
    const { productName, brand, categoryId, description, imageurls, createdAt } = data;

    const imageUrls = imageurls?.map((file) => `/uploads/product_images/${file.filename}`) || [];
    const descriptionJson = description ? { details: description } : { details: '' };

    const product = await this.prisma.product.create({
      data: {
        productName,
        brand,
        categoryId,
        adminId: data.adminId ?? null,
        employeeId: data.employeeId ?? null,
        imageUrls,
        description: descriptionJson,
        createdAt,
      },
    });

    // Activity logging
    if (data.adminId) {
      const admin = await this.prisma.admin.findUnique({ where: { id: data.adminId } });
      if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Created',
        description: `${admin.adminName} created product: ${product.productName}`,
        adminId: admin.id,
      });
    }

    if (data.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Created',
        description: `${employee.firstname} created product: ${product.productName}`,
        employeeId: employee.id,
      });
    }

    await this.safeCacheReset();

    return { message: 'Product created successfully', product };
  }

  // ================= PAGINATED GET =================
  async getAllProductsPaginated(page: number, limit: number) {
    const cacheKey = `products_page_${page}_limit_${limit}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        include: { category: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count(),
    ]);

    const result = {
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    // ✅ TTL as number
    await this.cacheManager.set(cacheKey, result, 30);

    return result;
  }

  // ================= GET ONE =================
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        stockIn: { include: { employee: true, product: true, admin: true, stockout: true } },
        admin: true,
        employee: true,
      },
    });
    if (!product) throw new BadRequestException('Product not found');
    return product;
  }

  // ================= UPDATE =================
  async updateProduct(
    id: string,
    data: {
      productName?: string;
      brand?: string;
      categoryId?: string;
      description?: string;
      keepImages?: string;
      adminId?: string;
      employeeId?: string;
      imageurls?: Express.Multer.File[];
    },
  ) {
    const existing = await this.getProductById(id);

    if (data.categoryId) {
      const categoryExists = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!categoryExists) throw new BadRequestException('Invalid categoryId');
    }

    // ================= Keep Images =================
    let keepImages: string[] = [];
    try {
      keepImages = data.keepImages ? JSON.parse(data.keepImages) : [];
      if (!Array.isArray(keepImages)) throw new Error();
    } catch {
      throw new BadRequestException('Invalid keepImages format');
    }

    // ================= New Images =================
    const newImages = data.imageurls?.map((file) => `/uploads/product_images/${file.filename}`) || [];
    const totalImages = keepImages.length + newImages.length;
    if (totalImages > 4) throw new BadRequestException('Maximum 4 images allowed');

    // ================= Delete Removed Images =================
    const existingImages: string[] = Array.isArray(existing.imageUrls) ? existing.imageUrls as string[] : [];
    const removedImages = existingImages.filter(url => url && !keepImages.includes(url));
    removedImages.forEach(url => url && deleteFile(String(url)));

    const imageUrls = [...keepImages, ...newImages];
    const descriptionJson = data.description ? { details: data.description } : undefined;

    // ================= Update Product =================
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        productName: data.productName ?? existing.productName,
        brand: data.brand ?? existing.brand,
        categoryId: data.categoryId ?? existing.categoryId,
        ...(descriptionJson ? { description: descriptionJson } : {}),
        imageUrls,
      },
    });

    // ================= Activity Logging =================
    if (data.adminId) {
      const admin = await this.prisma.admin.findUnique({ where: { id: data.adminId } });
      if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Updated',
        description: `${admin.adminName} updated product: ${updated.productName}`,
        adminId: admin.id,
      });
    }

    if (data.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Updated',
        description: `${employee.firstname} updated product: ${updated.productName}`,
        employeeId: employee.id,
      });
    }

    await this.safeCacheReset();
    return { message: 'Product updated successfully', product: updated };
  }

  // ================= DELETE =================
  async deleteProduct(
    id: string,
    data?: Partial<{ adminId: string; employeeId?: string }>,
  ) {
    const product = await this.getProductById(id);

    // ================= Delete Images =================
    const productImages: string[] = Array.isArray(product.imageUrls) ? product.imageUrls as string[] : [];
    productImages.forEach(img => img && deleteFile(String(img)));

    await this.prisma.product.delete({ where: { id } });

    // ================= Activity Logging =================
    if (data?.adminId) {
      const admin = await this.prisma.admin.findUnique({ where: { id: data.adminId } });
      if (!admin) throw new HttpException('Admin not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Deleted',
        description: `${admin.adminName} deleted product: ${product.productName}`,
        adminId: admin.id,
      });
    }

    if (data?.employeeId) {
      const employee = await this.prisma.employee.findUnique({ where: { id: data.employeeId } });
      if (!employee) throw new HttpException('Employee not found', HttpStatus.NOT_FOUND);
      await this.activityService.createActivity({
        activityName: 'Product Deleted',
        description: `${employee.firstname} deleted product: ${product.productName}`,
        employeeId: employee.id,
      });
    }

    await this.safeCacheReset();
    return { message: 'Product deleted successfully' };
  }

  // ================= SAFE CACHE RESET =================
  private async safeCacheReset() {
    try {
      // @ts-ignore
      if (this.cacheManager.store && typeof this.cacheManager.store.reset === 'function') {
        await (this.cacheManager.stores as any).reset();
      } else {
        console.warn('Cache store does not support reset');
      }
    } catch (err) {
      console.error('Error resetting cache:', err);
    }
  }
}
