import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);
        if (user && await bcrypt.compare(pass, user.password || '')) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
            user,
        };
    }

    async register(userDto: CreateUserDto) {
        // Check if user exists
        const existing = await this.usersService.findByEmail(userDto.email);
        if (existing) throw new ConflictException('User already exists');

        const hashedPassword = await bcrypt.hash(userDto.password, 10);
        const user = await this.usersService.create({ ...userDto, password: hashedPassword });
        return this.login(user); // Auto-login after register
    }
}
