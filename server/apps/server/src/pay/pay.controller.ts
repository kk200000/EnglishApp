import {
	Controller,
	Post,
	Body,
	UseGuards,
	Req,
	All,
	HttpCode,
	Res,
} from '@nestjs/common';
import { PayService } from './pay.service';
import type { CreatePayDto } from '@en/common/pay';
import { AuthGuard } from '@libs/shared/auth/auth.guard';
import type { Request, Response } from 'express';
@Controller('pay')
export class PayController {
	constructor(private readonly payService: PayService) {}

	@UseGuards(AuthGuard)
	@Post('create')
	create(@Body() createPayDto: CreatePayDto, @Req() req: Request) {
		const user = req.user;
		return this.payService.create(createPayDto, user);
	}

	@All('notify')
	@HttpCode(200)
	async notify(@Req() req: Request, @Res() res: Response) {
		const result = await this.payService.notify(req);
		return res.type('text/plain').send(result);
	}
}
