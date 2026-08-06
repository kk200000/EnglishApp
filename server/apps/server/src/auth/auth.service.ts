import { TokenPayload, Token } from '@en/common/user';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  generateToken(payload: TokenPayload): Token {
    return {
      accessToken: this.jwtService.sign({ ...payload, tokenType: 'access' }),
      refreshToken: this.jwtService.sign(
        { ...payload, tokenType: 'refresh' },
        { expiresIn: '7d' },
      ), // Refresh token valid for 7 days
    };
  }

  refreshToken(refreshToken: string) {}
}
