import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { TokenPayload } from '@en/common/user';

jest.mock('@libs/shared', () => ({
	PrismaService: class {},
	PayService: class {},
	ResponseService: class {},
}));
jest.mock('nanoid', () => ({ nanoid: () => 'test-order' }));

import { PayService } from './pay.service';
import { TradeStatus } from '@libs/shared/generated/prisma/enums';

type PaymentFixture = {
	id: string;
	userId: string;
	amount: { toFixed: () => string };
	tradeStatus: TradeStatus;
	body: string;
	tradeNo?: string;
};

function createFixture() {
	const sequence: string[] = [];
	const amount = { toFixed: () => '99.00' };
	const payment: PaymentFixture = {
		id: 'p1',
		userId: 'u1',
		amount,
		tradeStatus: TradeStatus.NOT_PAY,
		body: JSON.stringify({ courseId: 'c1', userId: 'u1' }),
	};
	const sdk = {
		checkNotifySignV2: jest.fn(() => true),
		pageExecute: jest.fn<
			string,
			[string, string, { bizContent: Record<string, unknown> }]
		>(() => 'https://sandbox/pay'),
	};
	const tx = {
		paymentRecord: {
			findUnique: jest.fn(() => Promise.resolve(payment)),
			updateMany: jest.fn<
				Promise<{ count: number }>,
				[{ where: { id: string; tradeStatus: TradeStatus } }]
			>(() => Promise.resolve({ count: 1 })),
		},
		courseRecord: {
			upsert: jest.fn<Promise<object>, [{ create: Record<string, unknown> }]>(() =>
				Promise.resolve({}),
			),
		},
	};
	const db = {
		course: {
			findUnique: jest.fn(() =>
				Promise.resolve({ id: 'c1', name: '课程', price: amount }),
			),
		},
		courseRecord: { findUnique: jest.fn(() => Promise.resolve(null)) },
		paymentRecord: {
			create: jest.fn<Promise<object>, [{ data: { amount: typeof amount } }]>(() =>
				Promise.resolve({}),
			),
		},
		$transaction: jest.fn(
			async (fn: (transaction: typeof tx) => Promise<string | null>) => {
				const result = await fn(tx);
				sequence.push('commit');
				return result;
			},
		),
	};
	const socket = { emitPaymentSuccess: jest.fn(() => sequence.push('notify')) };
	const values: Record<string, string> = {
		ALIPAY_APP_ID: 'app-test',
		ALIPAY_NOTIFY_URL: 'https://callback.test',
	};
	const config = { get: (key: string) => values[key] };
	const response = { success: <T>(data: T) => data, error: jest.fn() };
	type Dependencies = ConstructorParameters<typeof PayService>;
	const service = new PayService(
		db as unknown as Dependencies[0],
		config as unknown as Dependencies[1],
		response,
		socket as unknown as Dependencies[3],
		{ getAlipaySdk: () => sdk } as unknown as Dependencies[4],
	);
	return { service, sdk, db, tx, socket, payment, amount, sequence };
}

const request = (extra: Record<string, string> = {}) =>
	({
		body: {
			sign: 'signed',
			app_id: 'app-test',
			trade_status: 'TRADE_SUCCESS',
			out_trade_no: 'XM-test-order',
			trade_no: 'ali-test',
			total_amount: '99.00',
			...extra,
		},
	}) as unknown as Request;

describe('支付订单与回调', () => {
	let fixture: ReturnType<typeof createFixture>;
	beforeEach(() => {
		fixture = createFixture();
	});

	it('按服务端课程价格创建支付，忽略浏览器篡改的金额', async () => {
		const { service, sdk, db, amount } = fixture;
		await service.create(
			{
				courseId: 'c1',
				total_amount: '0.01',
				subject: '伪造标题',
				body: '测试',
			},
			{ userId: 'u1' } as TokenPayload,
		);
		expect(sdk.pageExecute.mock.calls[0][2].bizContent).toMatchObject({
			total_amount: '99.00',
			subject: '课程',
		});
		expect(db.paymentRecord.create.mock.calls[0][0].data.amount).toBe(amount);
	});

	it('签名无效时拒绝回调且不读取数据库', async () => {
		const { service, sdk, db } = fixture;
		sdk.checkNotifySignV2.mockReturnValue(false);
		await expect(service.notify(request())).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	it('签名有效但应用ID不符时拒绝', async () => {
		const { service, db } = fixture;
		await expect(
			service.notify(request({ app_id: 'another-app' })),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(db.$transaction).not.toHaveBeenCalled();
	});

	it('金额不符时不更新支付或发放课程', async () => {
		const { service, tx, socket } = fixture;
		await expect(
			service.notify(request({ total_amount: '0.01' })),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(tx.paymentRecord.updateMany).not.toHaveBeenCalled();
		expect(tx.courseRecord.upsert).not.toHaveBeenCalled();
		expect(socket.emitPaymentSuccess).not.toHaveBeenCalled();
	});

	it('有效支付等待事务提交后发通知，并返回支付宝成功确认', async () => {
		const { service, tx, sequence } = fixture;
		await expect(service.notify(request())).resolves.toBe('success');
		expect(tx.paymentRecord.updateMany.mock.calls[0][0].where).toEqual({
			id: 'p1',
			tradeStatus: TradeStatus.NOT_PAY,
		});
		expect(tx.courseRecord.upsert.mock.calls[0][0].create).toMatchObject({
			userId: 'u1',
			courseId: 'c1',
			paymentRecordId: 'p1',
			isPurchased: true,
		});
		expect(sequence).toEqual(['commit', 'notify']);
	});

	it('支付宝重复通知不会再次发课或通知', async () => {
		const { service, payment, tx, socket } = fixture;
		payment.tradeStatus = TradeStatus.TRADE_SUCCESS;
		payment.tradeNo = 'ali-test';
		await expect(service.notify(request())).resolves.toBe('success');
		expect(tx.paymentRecord.updateMany).not.toHaveBeenCalled();
		expect(tx.courseRecord.upsert).not.toHaveBeenCalled();
		expect(socket.emitPaymentSuccess).not.toHaveBeenCalled();
	});

	it('并发回调已被另一个事务消费时不会再次发课', async () => {
		const { service, tx, socket } = fixture;
		tx.paymentRecord.updateMany.mockResolvedValue({ count: 0 });
		await expect(service.notify(request())).resolves.toBe('success');
		expect(tx.courseRecord.upsert).not.toHaveBeenCalled();
		expect(socket.emitPaymentSuccess).not.toHaveBeenCalled();
	});
});
