import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private db: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = this.db.get('SELECT id FROM User WHERE email = ?', [dto.email]);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const role = dto.role?.toLowerCase() === 'organizer' ? 'ORGANIZER' : 'ATTENDEE';
    const id = uuidv4();
    const avatar = dto.avatar || this.generateAvatar(dto.fullName);

    this.db.run(
      'INSERT INTO User (id, fullName, email, password, role, avatar, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, dto.fullName, dto.email, hashed, role, avatar, new Date().toISOString()],
    );

    const user = this.db.get<any>('SELECT * FROM User WHERE id = ?', [id]);
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { token, user: this.mapUser(user, 0, 0) };
  }

  async login(dto: LoginDto) {
    const user = this.db.get<any>('SELECT * FROM User WHERE email = ?', [dto.email]);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    const eventsAttended = (this.db.get<any>('SELECT COUNT(*) as c FROM Ticket WHERE userId = ?', [user.id])?.c) || 0;
    const eventsCreated = (this.db.get<any>('SELECT COUNT(*) as c FROM Event WHERE createdById = ?', [user.id])?.c) || 0;

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { token, user: this.mapUser(user, eventsAttended, eventsCreated) };
  }

  async me(userId: string) {
    const user = this.db.get<any>('SELECT * FROM User WHERE id = ?', [userId]);
    if (!user) throw new UnauthorizedException();

    const eventsAttended = (this.db.get<any>('SELECT COUNT(*) as c FROM Ticket WHERE userId = ?', [userId])?.c) || 0;
    const eventsCreated = (this.db.get<any>('SELECT COUNT(*) as c FROM Event WHERE createdById = ?', [userId])?.c) || 0;

    return this.mapUser(user, eventsAttended, eventsCreated);
  }

  mapUser(user: any, eventsAttended: number, eventsCreated: number) {
    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      avatar: user.avatar || this.generateAvatar(user.fullName),
      role: user.role.toLowerCase() as 'attendee' | 'organizer',
      joinedDate: new Date(user.createdAt).toISOString().split('T')[0],
      eventsAttended,
      eventsCreated,
    };
  }

  private generateAvatar(name: string) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6d28d9&color=fff&size=128`;
  }
}
