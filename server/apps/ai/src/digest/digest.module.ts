import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DigestService } from './digest.service';
import { DigestProcessor } from './digest.processor';
import { digestQueueName } from './digest.queue';

@Module({})
export class DigestModule {
	static async register(): Promise<DynamicModule> {
		await ConfigModule.envVariablesLoaded;
		// 显式开启才连接Redis、注册定时邮件，避免影响已有聊天服务。
		if (process.env.ENABLE_EMAIL_DIGEST !== 'true')
			return { module: DigestModule };
		const required = [
			'REDIS_HOST',
			'REDIS_PORT',
			'EMAIL_HOST',
			'EMAIL_PORT',
			'EMAIL_USER',
			'EMAIL_PASSWORD',
			'EMAIL_FROM',
		];
		if (required.some((key) => !process.env[key])) {
			Logger.warn('邮件摘要配置不完整，未启用定时任务', 'DigestModule');
			return { module: DigestModule };
		}
		return {
			module: DigestModule,
			imports: [
				BullModule.forRootAsync({
					imports: [ConfigModule],
					inject: [ConfigService],
					useFactory: (config: ConfigService) => ({
						connection: {
							host: config.get<string>('REDIS_HOST'),
							port: Number(config.get<string>('REDIS_PORT')),
						},
					}),
				}),
				BullModule.registerQueue({ name: digestQueueName.name }),
			],
			providers: [DigestService, DigestProcessor],
		};
	}
}
