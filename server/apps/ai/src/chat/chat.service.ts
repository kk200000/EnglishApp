import { Injectable, OnModuleInit } from '@nestjs/common';
import { createDeepSeek, createCheckpoint } from '../llm/llm.config';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { ChatRoleType, ChatDto } from '@en/common/chat';
import type { AIMessageChunk, ReactAgent } from 'langchain';
import { chatMode } from '../prompt/prompt.mode';
import { createAgent } from 'langchain';
import { ResponseService } from '@libs/shared';
@Injectable()
export class ChatService implements OnModuleInit {
	constructor(private readonly responseService: ResponseService) {}
	private checkpointer: PostgresSaver;
	private agents: Map<ChatRoleType, ReactAgent> = new Map();
	async onModuleInit() {
		//1.初始化这个checkpoint
		this.checkpointer = await createCheckpoint(); //幂等性
		//2.创建多个Agent
		for (const mode of chatMode) {
			const agent = createAgent({
				model: createDeepSeek(), //模型
				systemPrompt: mode.prompt, //系统提示词
				checkpointer: this.checkpointer, //检查点
			});
			this.agents.set(mode.role, agent); //存入map
		}
	}

	streamCompletion(createChatDto: ChatDto) {
		//role->normal userId->123 content->你好
		//1.通过role读取对应的Agent
		const agent = this.agents.get(createChatDto.role);
		if (!agent) {
			throw new Error('模式不存在');
		}
		//2.组装消息格式
		const id = `${createChatDto.userId}-${createChatDto.role}`;
		const stream = agent.stream(
			{
				messages: [{ role: 'human', content: createChatDto.content }],
			},
			{
				configurable: { thread_id: id }, //用于做会话隔离 + 历史记录存储
				streamMode: 'messages', //流式输出模式
			},
		);
		return stream; //返回的是一个迭代器
	}

	async findAll(userId: string, role: ChatRoleType) {
		const messages = await this.checkpointer.get({
			configurable: { thread_id: `${userId}-${role}` },
		});
		const list = messages?.channel_values?.messages as AIMessageChunk[];
		if (!list) return this.responseService.success([]); //如果历史记录为空，则返回空数组
		return this.responseService.success(
			list.map((item) => ({
				content: item.content,
				role: item.type,
			})),
		);
	}
}
