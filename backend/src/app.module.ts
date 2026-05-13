import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { MediaModule } from './media/media.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        FRONTEND_URL: Joi.string().uri().optional(),
        // MinIO
        S3_ENDPOINT: Joi.string().optional(),
        AWS_ACCESS_KEY_ID: Joi.string().optional(),
        AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
        S3_BUCKET_NAME: Joi.string().optional(),
        AWS_REGION: Joi.string().optional(),
        // Auth0 (optional — when all three are set, login/register use Auth0; otherwise legacy bcrypt)
        AUTH0_DOMAIN: Joi.string().optional(),
        AUTH0_CLIENT_ID: Joi.string().optional(),
        AUTH0_CLIENT_SECRET: Joi.string().optional(),
        AUTH0_AUDIENCE: Joi.string().optional(),
        AUTH0_DB_CONNECTION: Joi.string().optional(),
      }),
    }),
    PrismaModule,
    AuthModule,
    ChatModule,
    UsersModule,
    PropertiesModule,
    MediaModule,
    BookingsModule,
    AvailabilityModule,
    GeoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
