import { Injectable } from '@nestjs/common';

@Injectable()
export class ResponseService {
    success(data: any = null, message: string = '操作成功',code: number = 200) {
        return {
            data,
            message,
            code
        }
    }
    error(message: string = '操作失败', code: number = 500) {
        return {
            message,
            code
        }
    }
}
