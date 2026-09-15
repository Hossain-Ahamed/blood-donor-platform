import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable URI versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT') || 3001;
  const corsOrigin = configService.get<string>('CORS_ORIGIN');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 API is running on: http://localhost:${port}/v1`);
}
bootstrap();

