import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;
    if (!headers.authorization) {
      throw new UnauthorizedException('Authorization header is missing'); // 401
    }
    const token = headers.authorization.split(' ')[1];
    this.jwtService.verify(token);
    try {
      const decoded = this.jwtService.decode(token);
      if (decoded.tokenType !== 'access') {
        throw new UnauthorizedException('Invalid token type'); //401
      }
      request.user = decoded; // Attach the decoded token to the request object
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token'); // 401
    }
  }
}
