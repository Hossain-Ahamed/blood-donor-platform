import { UsersModule } from "./modules/users/users.module";
import { DonorProfilesModule } from "./modules/donor-profiles/donor-profiles.module";
import { RequestsModule } from "./modules/requests/requests.module";
import { ResponsesModule } from "./modules/responses/responses.module";
import { DonationsModule } from "./modules/donations/donations.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { AuditLogsModule } from "./modules/audit-logs/audit-logs.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PushSubscriptionsModule } from "./modules/push-subscriptions/push-subscriptions.module";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { validateEnv } from "./config/env.validation";
import { dataSourceOptions } from "./config/typeorm.config";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RedisModule } from "./modules/redis/redis.module";
import { HealthModule } from "./modules/health/health.module";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";

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
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("RATE_LIMIT_TTL", 60000),
          limit: config.get<number>("RATE_LIMIT_MAX", 60),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    RedisModule,
    AuthModule,
    HealthModule,
    UsersModule,
    DonorProfilesModule,
    RequestsModule,
    ResponsesModule,
    DonationsModule,
    ReportsModule,
    AuditLogsModule,
    AdminModule,
    PushSubscriptionsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
