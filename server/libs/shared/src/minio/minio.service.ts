import {
	Injectable,
	Logger,
	OnModuleInit,
	ServiceUnavailableException,
} from '@nestjs/common';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MinioService implements OnModuleInit {
	private readonly logger = new Logger(MinioService.name);
	private minioClient: Minio.Client | null = null;
	private bucketName: string | null = null;

	constructor(private readonly configService: ConfigService) {}

	onModuleInit(): void {
		// 显式开启后才创建客户端；已有连接参数不会自动启用对象存储。
		const enabled = String(this.configService.get('MINIO_ENABLED') ?? '')
			.trim()
			.toLowerCase();
		if (enabled !== 'true' && enabled !== '1') {
			this.logger.log('MinIO 未启用，跳过对象存储初始化');
			return;
		}

		// 后台初始化避免远端无响应拖住应用启动；就绪前上传返回503。
		void this.initialize();
	}

	private async initialize(): Promise<void> {
		try {
			const required = (key: string): string => {
				const value = this.configService.get<string>(key)?.trim();
				if (!value) throw new Error(`缺少配置 ${key}`);
				return value;
			};
			const bucket = required('MINIO_BUCKET');
			const port = Number(this.configService.get('MINIO_PORT') ?? 9000);
			if (!Number.isInteger(port) || port < 1 || port > 65535) {
				throw new Error('MINIO_PORT 必须是有效端口');
			}
			const ssl = String(this.configService.get('MINIO_USE_SSL') ?? '')
				.trim()
				.toLowerCase();
			const client = new Minio.Client({
				endPoint: required('MINIO_ENDPOINT'),
				port,
				useSSL: ssl === 'true' || ssl === '1',
				accessKey: required('MINIO_ACCESS_KEY'),
				secretKey: required('MINIO_SECRET_KEY'),
				retryOptions: { disableRetry: true },
			});
			if (!(await client.bucketExists(bucket))) {
				await client.makeBucket(bucket);
				await client.setBucketPolicy(
					bucket,
					JSON.stringify({
						Version: '2012-10-17',
						Statement: [
							{
								Sid: 'PublicReadObjects',
								Effect: 'Allow',
								Principal: '*',
								Action: ['s3:GetObject'],
								Resource: [`arn:aws:s3:::${bucket}/*`],
							},
						],
					}),
				);
			}
			this.minioClient = client;
			this.bucketName = bucket;
		} catch (error) {
			// 对象存储异常只停用上传，不中断登录、课程等核心服务启动。
			this.minioClient = null;
			this.bucketName = null;
			const message = error instanceof Error ? error.message : '未知错误';
			this.logger.warn(`MinIO 初始化失败，上传功能暂不可用：${message}`);
		}
	}

	getClient(): Minio.Client {
		if (!this.minioClient) {
			throw new ServiceUnavailableException('对象存储未启用或暂不可用');
		}
		return this.minioClient;
	}

	getBucket(): string {
		if (!this.bucketName) {
			throw new ServiceUnavailableException('对象存储未启用或暂不可用');
		}
		return this.bucketName;
	}
}
