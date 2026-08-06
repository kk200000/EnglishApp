import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SharedModule } from '@libs/shared';

/**
 *  关键规则： 一个模块的 providers 默认是私有的
 * 只有放入 exports 后，其他模块通过 imports 引入时才能使用。
 * 
 * imports（导入）
 * 值是模块类的数组
导入后，本模块就能注入被导入模块 exports 中暴露的 providers
例如：imports: [UserModule] 后，UserModule 导出的 UserService 就能在本模块注入了
 * 
 * exports
 * 值是本模块 providers 的子集
 * 只有被 exports 导出的 provider，其他模块 imports 本模块后才能使用也可以直接导出整个模块：exports: [UserModule]
 * 
 * 
 * providers（提供者）
* 值是可注入的服务类的数组（如 Service、Repository、Guard 等）
* 封装核心业务逻辑，通过依赖注入被 controllers 或其他 providers 使用
* 默认只在模块内部可用，除非通过 exports 导出
 * 

 */

@Module({
  imports: [SharedModule,],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
