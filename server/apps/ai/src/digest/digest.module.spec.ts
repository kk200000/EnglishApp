jest.mock('@nestjs/config', () => ({
	ConfigModule: { envVariablesLoaded: Promise.resolve() },
	ConfigService: class {},
}));
jest.mock('@nestjs/bullmq', () => ({
	BullModule: {
		forRootAsync: jest.fn(() => ({})),
		registerQueue: jest.fn(() => ({})),
	},
}));
jest.mock('./digest.service', () => ({ DigestService: class {} }));
jest.mock('./digest.processor', () => ({ DigestProcessor: class {} }));

const { BullModule } = jest.requireMock<{
	BullModule: { forRootAsync: jest.Mock; registerQueue: jest.Mock };
}>('@nestjs/bullmq');
import { DigestModule } from './digest.module';

describe('可选邮件摘要模块', () => {
	const keys = [
		'ENABLE_EMAIL_DIGEST',
		'REDIS_HOST',
		'REDIS_PORT',
		'EMAIL_HOST',
		'EMAIL_PORT',
		'EMAIL_USER',
		'EMAIL_PASSWORD',
		'EMAIL_FROM',
	];
	let saved: (string | undefined)[];
	beforeEach(() => {
		saved = keys.map((key) => process.env[key]);
		keys.forEach((key) => delete process.env[key]);
		jest.clearAllMocks();
	});
	afterEach(() =>
		keys.forEach((key, i) => {
			if (saved[i] === undefined) delete process.env[key];
			else process.env[key] = saved[i];
		}),
	);

	it('默认不开启时不注册Redis连接或任何队列', async () => {
		expect(await DigestModule.register()).toEqual({ module: DigestModule });
		expect(BullModule.forRootAsync).not.toHaveBeenCalled();
		expect(BullModule.registerQueue).not.toHaveBeenCalled();
	});

	it('显式开启但环境不全时不注册Redis连接', async () => {
		process.env.ENABLE_EMAIL_DIGEST = 'true';
		expect(await DigestModule.register()).toEqual({ module: DigestModule });
		expect(BullModule.forRootAsync).not.toHaveBeenCalled();
	});

	it('显式开启且配置齐全才注册队列', async () => {
		keys.forEach((key) => (process.env[key] = 'configured'));
		process.env.ENABLE_EMAIL_DIGEST = 'true';
		const module = await DigestModule.register();
		expect(module.providers).toHaveLength(2);
		expect(BullModule.forRootAsync).toHaveBeenCalledTimes(1);
		expect(BullModule.registerQueue).toHaveBeenCalledTimes(1);
	});
});
