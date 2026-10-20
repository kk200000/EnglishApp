import { PrismaClient } from '../libs/shared/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as Minio from 'minio';
import fs from 'node:fs';
import 'dotenv/config';
const data = [
	{
		name: '高考单词',
		value: 'gk',
		description: '覆盖高考大纲核心词汇，按考频与题型分类，助力考前冲刺提分。',
		teacher: '小余同学',
		url: '',
		price: 100,
	},
	{
		name: '中考单词',
		value: 'zk',
		description: '紧扣中考考纲，初中三年词汇一站式掌握，打好英语基础。',
		teacher: '小满zs',
		url: '',
		price: 35,
	},
	{
		name: 'GRE单词',
		value: 'gre',
		description: 'GRE 核心词汇与同反义词拓展，适合留学备考与高阶阅读。',
		teacher: '初心哥',
		url: '',
		price: 80,
	},
	{
		name: '托福词汇',
		value: 'toefl',
		description: '托福听说读写高频词 + 学术场景词汇，提升备考效率。',
		teacher: '枫竹',
		url: '',
		price: 80000,
	},
	{
		name: '雅思词汇',
		value: 'ielts',
		description: '雅思考试常考词汇与同义替换，兼顾移民与留学需求。',
		teacher: 'ouka',
		url: '',
		price: 7000,
	},
	{
		name: '大学英语六级单词',
		value: 'cet6',
		description: '六级大纲词汇与真题高频词，配合阅读与写作场景记忆。',
		teacher: '章政',
		url: '',
		price: 5,
	},
	{
		name: '大学英语四级单词',
		value: 'cet4',
		description: '四级核心词汇与考点搭配，适合在校生系统备考。',
		teacher: '小余同学',
		url: '',
		price: 8,
	},
	{
		name: '考研单词',
		value: 'ky',
		description: '考研英语一/二通用词汇，结合真题与长难句场景记忆。',
		teacher: '远方',
		url: '',
		price: 9.99,
	},
];
const main = async () => {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
	});
	const bucket = 'course';
	let minio: Minio.Client | null = null;
	const enabled = ['true', '1'].includes(
		(process.env.MINIO_ENABLED ?? '').trim().toLowerCase(),
	);
	// 关闭对象存储时仍可写入课程；旧课程图片地址不会被清空。
	if (enabled) {
		try {
			for (const key of [
				'MINIO_ENDPOINT',
				'MINIO_ACCESS_KEY',
				'MINIO_SECRET_KEY',
			]) {
				if (!process.env[key]?.trim()) throw new Error(`缺少配置 ${key}`);
			}
			const client = new Minio.Client({
				endPoint: process.env.MINIO_ENDPOINT!,
				port: Number(process.env.MINIO_PORT ?? 9000),
				useSSL: ['true', '1'].includes(
					(process.env.MINIO_USE_SSL ?? '').trim().toLowerCase(),
				),
				accessKey: process.env.MINIO_ACCESS_KEY!,
				secretKey: process.env.MINIO_SECRET_KEY!,
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
								Sid: 'CourseReadObjects',
								Effect: 'Allow',
								Principal: '*',
								Action: ['s3:GetObject'],
								Resource: [`arn:aws:s3:::${bucket}/*`],
							},
						],
					}),
				);
			}
			minio = client;
		} catch (error) {
			const message = error instanceof Error ? error.message : '未知错误';
			console.warn(`MinIO 不可用，跳过课程图片上传：${message}`);
		}
	} else {
		console.log('MINIO_ENABLED 未开启，跳过课程图片上传');
	}

	try {
		await prisma.$connect();
		for (const item of data) {
			const existing = await prisma.course.findFirst({
				where: { value: item.value },
			});
			let url = existing?.url ?? item.url;
			if (minio) {
				const file = fs.readFileSync(`./prisma/assets/${item.value}.png`);
				await minio.putObject(bucket, `${item.value}.png`, file, file.length, {
					'Content-Type': 'image/png',
				});
				url = `/${bucket}/${item.value}.png`;
				console.log(`${item.value}.png 上传成功`);
			}
			const course = { ...item, url };
			if (existing) {
				await prisma.course.update({ where: { id: existing.id }, data: course });
			} else {
				await prisma.course.create({ data: course });
			}
			console.log(`${item.value} 课程已写入`);
		}
	} finally {
		await prisma.$disconnect();
	}
};

main().catch((error: unknown) => {
	console.error(error);
	process.exitCode = 1;
});
