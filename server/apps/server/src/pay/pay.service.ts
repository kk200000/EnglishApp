import {
	BadRequestException,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import type { CreatePayDto } from '@en/common/pay';
import type { TokenPayload } from '@en/common/user';
import {
	PrismaService,
	PayService as SharedPayService,
	ResponseService,
} from '@libs/shared';
import { ConfigService } from '@nestjs/config';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import type { Request } from 'express';
import { TradeStatus } from '@libs/shared/generated/prisma/enums';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class PayService {
	constructor(
		private readonly prismaService: PrismaService,
		private readonly configService: ConfigService,
		private readonly responseService: ResponseService,
		private readonly socketGateway: SocketGateway,
		private readonly sharedPayService: SharedPayService,
	) {}

	async create(dto: CreatePayDto, user: TokenPayload) {
		const sdk = this.sharedPayService.getAlipaySdk();
		const base = this.configService.get<string>('ALIPAY_NOTIFY_URL');
		if (!base) throw new ServiceUnavailableException('支付回调地址尚未配置');
		const course = await this.prismaService.course.findUnique({
			where: { id: dto.courseId },
		});
		if (!course) throw new BadRequestException('课程不存在');
		const purchased = await this.prismaService.courseRecord.findUnique({
			where: { userId_courseId: { userId: user.userId, courseId: course.id } },
		});
		if (purchased?.isPurchased)
			return this.responseService.error(null, '您已经购买过该课程');
		const outTradeNo = `XM-${nanoid(12)}`;
		const expires = dayjs().add(1, 'minute');
		const metadata = JSON.stringify({ courseId: course.id, userId: user.userId });
		// 金额与商品名称从服务端课程读取，不能信任浏览器传入价格。
		const amount = course.price.toFixed(2);
		const payUrl = sdk.pageExecute('alipay.trade.page.pay', 'GET', {
			bizContent: {
				out_trade_no: outTradeNo,
				total_amount: amount,
				subject: course.name,
				body: metadata,
				product_code: 'FAST_INSTANT_TRADE_PAY',
				time_expire: expires.format('YYYY-MM-DD HH:mm:ss'),
			},
			notify_url: `${base.replace(/\/$/, '')}/api/v1/pay/notify`,
		});
		await this.prismaService.paymentRecord.create({
			data: {
				userId: user.userId,
				outTradeNo,
				amount: course.price,
				subject: course.name,
				body: metadata,
			},
		});
		return this.responseService.success({
			payUrl,
			timeExpire: expires.valueOf(),
		});
	}

	async notify(req: Request) {
		const sdk = this.sharedPayService.getAlipaySdk();
		const payload = req.body as Record<string, string>;
		if (!payload || !payload.sign || !sdk.checkNotifySignV2(payload)) {
			throw new BadRequestException('支付回调签名无效');
		}
		if (payload.app_id !== this.configService.get<string>('ALIPAY_APP_ID')) {
			throw new BadRequestException('支付应用不匹配');
		}
		if (!['TRADE_SUCCESS', 'TRADE_FINISHED'].includes(payload.trade_status))
			return 'success';
		const result = await this.prismaService.$transaction(async (tx) => {
			const payment = await tx.paymentRecord.findUnique({
				where: { outTradeNo: payload.out_trade_no },
			});
			if (
				!payment ||
				!/^\d+(\.\d{1,2})?$/.test(payload.total_amount || '') ||
				payment.amount.toFixed(2) !== Number(payload.total_amount).toFixed(2) ||
				!payload.trade_no
			) {
				throw new BadRequestException('支付订单或金额不匹配');
			}
			if (payment.tradeStatus === TradeStatus.TRADE_SUCCESS) {
				if (payment.tradeNo !== payload.trade_no)
					throw new BadRequestException('支付交易号不匹配');
				return null;
			}
			const metadata = JSON.parse(payment.body) as {
				courseId: string;
				userId: string;
			};
			if (!metadata.courseId || metadata.userId !== payment.userId)
				throw new BadRequestException('订单信息无效');
			// 条件更新锁住本订单，支付宝并发重试不会重复发放课程。
			const updated = await tx.paymentRecord.updateMany({
				where: { id: payment.id, tradeStatus: TradeStatus.NOT_PAY },
				data: {
					tradeNo: payload.trade_no,
					tradeStatus: TradeStatus.TRADE_SUCCESS,
					sendPayTime: new Date(),
				},
			});
			if (!updated.count) return null;
			await tx.courseRecord.upsert({
				where: {
					userId_courseId: { userId: payment.userId, courseId: metadata.courseId },
				},
				create: {
					userId: payment.userId,
					courseId: metadata.courseId,
					isPurchased: true,
					paymentRecordId: payment.id,
				},
				update: { isPurchased: true, paymentRecordId: payment.id },
			});
			return payment.userId;
		});
		if (result) this.socketGateway.emitPaymentSuccess(result);
		return 'success';
	}
}
