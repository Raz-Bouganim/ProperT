import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from '../media/media.module';
import { PropertyAuthorizationService } from './property-authorization.service';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

@Module({
  imports: [ConfigModule, MediaModule],
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyAuthorizationService],
})
export class PropertiesModule {}
