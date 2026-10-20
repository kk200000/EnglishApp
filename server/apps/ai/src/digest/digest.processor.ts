import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { digestQueueName } from './digest.queue';
import { DigestService } from './digest.service';
import { EmailService } from '@libs/shared';
@Processor(digestQueueName.name)
export class DigestProcessor extends WorkerHost {
	constructor(
		private readonly digestService: DigestService,
		private readonly emailService: EmailService,
	) {
		super();
	}
	async process(job: Job<unknown>) {
		if (job.name === digestQueueName.task.emailDigest) {
			const data = job.data;
			if (
				typeof data !== 'object' ||
				data === null ||
				!('text' in data) ||
				typeof data.text !== 'string' ||
				!('email' in data) ||
				typeof data.email !== 'string'
			) {
				throw new Error('邮件摘要任务数据无效');
			}
			const { text, email } = data;
			await this.emailService.sendEmail(email, '每日单词记忆报告', text);
			console.log('邮件发送成功');
		}
		if (job.name === digestQueueName.task.everyDayDigest) {
			await this.digestService.handleEmailDigest();
			console.log('每天任务消费成功');
		}
	}
}
