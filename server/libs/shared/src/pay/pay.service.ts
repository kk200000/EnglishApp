import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AlipaySdk } from 'alipay-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayService {
	private alipaySdk?: AlipaySdk;
	constructor(private readonly configService: ConfigService) {}

	getAlipaySdk() {
		// 未配置支付时，普通应用仍可启动；支付请求明确返回503。
		if (!this.alipaySdk) {
			const keys = [
				'ALIPAY_APP_ID',
				'ALIPAY_PRIVATE_KEY',
				'ALIPAY_PUBLIC_KEY',
				'ALIPAY_GATEWAY',
			] as const;
			if (keys.some((key) => !this.configService.get<string>(key))) {
				throw new ServiceUnavailableException('支付服务尚未配置');
			}
			this.alipaySdk = new AlipaySdk({
				appId: this.configService.get<string>('ALIPAY_APP_ID')!,
				privateKey: this.configService.get<string>('ALIPAY_PRIVATE_KEY')!,
				alipayPublicKey: this.configService.get<string>('ALIPAY_PUBLIC_KEY')!,
				gateway: this.configService.get<string>('ALIPAY_GATEWAY')!,
			});
		}
		return this.alipaySdk;
	}
}
