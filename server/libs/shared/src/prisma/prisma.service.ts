import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaService {
  public findMany(): Array<{ id: number; name: string }> {
    return [{ id: 1, name: 'John Doe' }];
  }
}
