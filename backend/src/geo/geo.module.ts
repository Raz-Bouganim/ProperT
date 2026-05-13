import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GeoService } from './geo.service';
import { GeoController } from './geo.controller';

@Module({
  imports: [HttpModule],
  providers: [GeoService],
  controllers: [GeoController],
})
export class GeoModule {}
