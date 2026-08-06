import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Token } from '@en/common/user';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('login')
  login(@Body() createUserDto: any) {
    return this.userService.login(createUserDto);
  }

  @Post('register')
  register(@Body() createUserDto: any) {
    return this.userService.register(createUserDto);
  }

  @Post('refresh-token')
  refreshToken(@Body('refreshToken') createUserDto: Omit<Token, 'accessToken'>) {
    return this.userService.refreshToken(createUserDto);
  }
}
