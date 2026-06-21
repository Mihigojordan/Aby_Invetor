import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async check(key: string): Promise<any | null> {
    const record = await this.prisma.idempotencyKey.findFirst({
      where: {
        key,
        expiresAt: { gt: new Date() },
      },
    });
    return record?.response ?? null;
  }

  async store(key: string, response: any): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL
    await this.prisma.idempotencyKey.upsert({
      where: { key },
      update: { response, expiresAt },
      create: { key, response, expiresAt },
    });
  }

  async cleanup(): Promise<void> {
    await this.prisma.idempotencyKey.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
