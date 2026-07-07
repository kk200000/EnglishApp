import { PrismaService, ResponseService } from '@libs/shared';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly response: ResponseService,
  ) {}
  getHello() {
    return 123
  }
}
