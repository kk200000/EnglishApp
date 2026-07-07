import { Injectable } from '@nestjs/common';
import 'dotenv/config'
import { PrismaClient } from  '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg';
console.log(process.env.DATABASE_URL);
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter })
  }
}
