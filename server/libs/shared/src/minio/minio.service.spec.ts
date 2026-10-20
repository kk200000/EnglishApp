import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MinioService } from './minio.service';
import { UserService } from '../../../../apps/server/src/user/user.service';

jest.mock('minio', () => ({ Client: jest.fn() }));
jest.mock('@libs/shared', () => ({
	PrismaService: jest.fn(),
	ResponseService: jest.fn(),
}));

describe('MinioService 可选对象存储', () => {
	const configuration = {
		MINIO_ENABLED: 'true',
		MINIO_ENDPOINT: 'localhost',
		MINIO_PORT: '9000',
		MINIO_USE_SSL: 'false',
		MINIO_ACCESS_KEY: 'test-key',
		MINIO_SECRET_KEY: 'test-secret',
		MINIO_BUCKET: 'custom-avatar',
	};
	const ClientMock = Minio.Client as jest.MockedClass<typeof Minio.Client>;
	let warnSpy: jest.SpyInstance;
	let client: {
		bucketExists: jest.Mock<Promise<boolean>, [string]>;
		makeBucket: jest.Mock<Promise<void>, [string]>;
		setBucketPolicy: jest.Mock<Promise<void>, [string, string]>;
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
		warnSpy = jest
			.spyOn(Logger.prototype, 'warn')
			.mockImplementation(() => undefined);
		client = {
			bucketExists: jest.fn<Promise<boolean>, [string]>().mockResolvedValue(true),
			makeBucket: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
			setBucketPolicy: jest
				.fn<Promise<void>, [string, string]>()
				.mockResolvedValue(undefined),
		};
		ClientMock.mockImplementation(() => client as unknown as Minio.Client);
	});

	afterEach(() => jest.restoreAllMocks());

	it.each([undefined, 'false', '0'])(
		'开关为 %s 时不创建客户端或访问存储',
		async (enabled) => {
			const service = new MinioService(
				new ConfigService({ ...configuration, MINIO_ENABLED: enabled }),
			);
			service.onModuleInit();
			await new Promise<void>((resolve) => setImmediate(resolve));
			expect(ClientMock).not.toHaveBeenCalled();
			expect(client.bucketExists).not.toHaveBeenCalled();
			expect(() => service.getClient()).toThrow(ServiceUnavailableException);
			expect(() => service.getBucket()).toThrow(ServiceUnavailableException);
		},
	);

	it('显式开启后初始化客户端，保留已有桶', async () => {
		const service = new MinioService(new ConfigService(configuration));
		service.onModuleInit();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(service.getClient()).toBe(client);
		expect(service.getBucket()).toBe('custom-avatar');
		expect(client.makeBucket).not.toHaveBeenCalled();
	});

	it('新建桶策略使用配置桶名', async () => {
		client.bucketExists.mockResolvedValue(false);
		const service = new MinioService(new ConfigService(configuration));
		service.onModuleInit();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(client.makeBucket).toHaveBeenCalledWith('custom-avatar');
		const policy = client.setBucketPolicy.mock.calls[0][1];
		expect(policy).toContain('arn:aws:s3:::custom-avatar/*');
	});

	it('缺少配置不会中断模块初始化', async () => {
		const service = new MinioService(
			new ConfigService({ MINIO_ENABLED: 'true' }),
		);
		expect(() => service.onModuleInit()).not.toThrow();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(ClientMock).not.toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalled();
		expect(() => service.getClient()).toThrow(ServiceUnavailableException);
	});

	it('连接失败仅停用上传，不使应用启动失败', async () => {
		client.bucketExists.mockRejectedValue(new Error('connection refused'));
		const service = new MinioService(new ConfigService(configuration));
		expect(() => service.onModuleInit()).not.toThrow();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(warnSpy).toHaveBeenCalled();
		expect(() => service.getClient()).toThrow(ServiceUnavailableException);
	});

	it('端口错误不会中断模块初始化', async () => {
		const service = new MinioService(
			new ConfigService({ ...configuration, MINIO_PORT: 'bad' }),
		);
		expect(() => service.onModuleInit()).not.toThrow();
		await new Promise<void>((resolve) => setImmediate(resolve));
		expect(ClientMock).not.toHaveBeenCalled();
	});

	it('远端无响应也不阻塞应用启动', () => {
		client.bucketExists.mockReturnValue(new Promise<boolean>(() => undefined));
		const service = new MinioService(new ConfigService(configuration));
		expect(service.onModuleInit()).toBeUndefined();
		expect(() => service.getClient()).toThrow(ServiceUnavailableException);
	});
	it('关闭对象存储时头像上传明确返回503', async () => {
		const service = new MinioService(new ConfigService({}));
		service.onModuleInit();
		await new Promise<void>((resolve) => setImmediate(resolve));
		const user = new UserService(
			{} as never,
			{} as never,
			{} as never,
			{} as never,
			service,
			new ConfigService({}),
		);
		const file = {
			size: 1,
			buffer: Buffer.from('x'),
			originalname: 'avatar.png',
			mimetype: 'image/png',
		} as Express.Multer.File;
		await expect(user.uploadAvatar(file)).rejects.toMatchObject({ status: 503 });
		expect(ClientMock).not.toHaveBeenCalled();
	});
});
