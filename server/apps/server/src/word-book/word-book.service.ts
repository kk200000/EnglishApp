import { Injectable } from '@nestjs/common';
import type { WordQuery } from '@en/common/word'
import { ResponseService, PrismaService } from '@libs/shared'
import type { Prisma } from '@libs/shared/generated/prisma/client'
@Injectable()
export class WordBookService {
  constructor(private readonly response: ResponseService, private readonly prisma: PrismaService) { }


  toBoolean(value: any): boolean | undefined {
    return value === 'true' ? true : undefined;
  }

  async findAll(query: WordQuery) {
    const { page = 1, pageSize = 12, word, ...rest } = query

    const tags = Object.fromEntries(Object.entries(rest).map(([key, value]) => [key, this.toBoolean(value)]))
    const where: Prisma.WordBookWhereInput = {
      word: word ? { contains: word } : undefined,
      ...tags
    }
    const [total,list] = await Promise.all([
      this.prisma.wordBook.count({ where }),
      this.prisma.wordBook.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: Number(pageSize),
        orderBy:{
          frq:'desc'
        }
      })
    ])
    return this.response.success({ total, list })
  }

}
