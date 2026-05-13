import { Module } from '@nestjs/common';
import { PropertyAuthorizationService } from './property-authorization.service';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyAuthorizationService],
})
export class PropertiesModule {}
