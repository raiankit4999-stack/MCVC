import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { APP_CONFIG, AppConfig } from '../config';
import { PrismaService } from '../common/prisma.service';
import { randomToken, sha256 } from '../common/crypto';

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const; // OWASP baseline for argon2id

@Injectable()
export class AuthService {
  /** Hash of a random secret, verified against for unknown accounts to equalise timing. */
  private readonly dummyHash = hash(randomToken(), ARGON_OPTS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  hashPassword(password: string) {
    return hash(password, ARGON_OPTS);
  }

  async register(input: { name: string; email: string; phone?: string; password: string }, meta: SessionMeta) {
    const email = input.email.toLowerCase();
    const exists = await this.prisma.user.findFirst({ where: { OR: [{ email }, ...(input.phone ? [{ phone: input.phone }] : [])] } });
    if (exists) throw new ConflictException('An account with this email or phone already exists');
    const user = await this.prisma.user.create({
      data: { name: input.name, email, phone: input.phone, passwordHash: await this.hashPassword(input.password) },
    });
    return this.issueSession(user.id, meta);
  }

  async login(emailOrPhone: string, password: string, meta: SessionMeta) {
    const id = emailOrPhone.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({ where: { OR: [{ email: id }, { phone: id }] } });
    // Always run a verification to keep timing similar for unknown users.
    const ok = user ? await verify(user.passwordHash, password) : await verify(await this.dummyHash, password);
    if (!user || !ok || !user.isActive) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueSession(user.id, meta);
  }

  async refresh(refreshToken: string, meta: SessionMeta) {
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: sha256(refreshToken) } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      if (session && !session.revokedAt) await this.revoke(session.id);
      throw new UnauthorizedException('Session expired');
    }
    // Rotate: revoke the old refresh token and issue a new pair.
    await this.revoke(session.id);
    return this.issueSession(session.userId, meta);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({ where: { refreshTokenHash: sha256(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private revoke(sessionId: string) {
    return this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  private async issueSession(userId: string, meta: SessionMeta) {
    const refreshToken = randomToken(48);
    await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: sha256(refreshToken),
        userAgent: meta.userAgent?.slice(0, 300),
        ip: meta.ip,
        expiresAt: new Date(Date.now() + this.config.refreshTokenTtlDays * 86400_000),
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'access' },
      { secret: this.config.jwtAccessSecret, expiresIn: this.config.accessTokenTtlSeconds, algorithm: 'HS256' },
    );
    return { accessToken, refreshToken, expiresIn: this.config.accessTokenTtlSeconds };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, platformRole: true,
        memberships: {
          where: { isActive: true, store: { deletedAt: null } },
          select: { store: { select: { id: true, name: true, slug: true, membershipStatus: true } }, role: { select: { name: true, permissions: true } } },
        },
        scopes: { select: { cityId: true, areaId: true } },
      },
    });
    return {
      ...user,
      memberships: user.memberships.map((m) => ({ ...m.store, role: m.role.name, permissions: m.role.permissions })),
    };
  }
}

export interface SessionMeta { userAgent?: string; ip?: string }

