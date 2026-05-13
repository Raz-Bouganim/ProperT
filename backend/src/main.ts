import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global Pipes & Filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('ProperT API')
    .setDescription('The Real Estate API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  // Default 4000: macOS often uses 5000 for AirPlay Receiver (AirTunes), which breaks local API calls.
  const rawPort = configService.get<string>('PORT');
  const parsed = rawPort !== undefined ? Number(rawPort) : NaN;
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 4000;
  await app.listen(port);
  console.log(`Backend is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api`);
}
void bootstrap();
