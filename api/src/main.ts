import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.INGEST_API_KEY || process.env.INGEST_API_KEY.length < 24) {
    throw new Error('INGEST_API_KEY deve ter pelo menos 24 caracteres');
  }
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' });
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.PORT || 3000));
}

bootstrap();
