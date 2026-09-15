import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';
import { dataSourceOptions } from './config/typeorm.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { DonorProfilesModule } from './modules/donor-profiles/donor-profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => dataSourceOptions,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('RATE_LIMIT_TTL', 60000),
        limit: config.get<number>('RATE_LIMIT_MAX', 60),
      }],
    }),
    CommonModule,
    RedisModule,
    AuthModule,
    HealthModule,
    UsersModule,
    DonorProfilesModule,
  ],
  controllers: [],
  providers: [],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    }
  ],
})
export class AppModule { }

export class AppModule {}
