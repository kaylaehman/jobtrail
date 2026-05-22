import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const port = parseInt(process.env.PORT ?? '8000', 10);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[jobtrail-backend] listening on :${port}`);
}

bootstrap();
