import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
	private transporter?: nodemailer.Transporter;
	constructor(private readonly configService: ConfigService) {}

	async sendEmail(to: string, subject: string, text: string) {
		if (!this.transporter) {
			const keys = [
				'EMAIL_HOST',
				'EMAIL_PORT',
				'EMAIL_USER',
				'EMAIL_PASSWORD',
				'EMAIL_FROM',
			];
			if (keys.some((key) => !this.configService.get<string>(key))) {
				throw new ServiceUnavailableException('邮件服务尚未配置');
			}
			this.transporter = nodemailer.createTransport({
				host: this.configService.get<string>('EMAIL_HOST'),
				port: Number(this.configService.get<string>('EMAIL_PORT')),
				secure: this.configService.get<string>('EMAIL_USE_SSL') === '1',
				auth: {
					user: this.configService.get<string>('EMAIL_USER'),
					pass: this.configService.get<string>('EMAIL_PASSWORD'),
				},
			});
		}
		await this.transporter.sendMail({
			from: this.configService.get<string>('EMAIL_FROM'),
			to,
			subject,
			html: text,
		});
		return true;
	}
}
