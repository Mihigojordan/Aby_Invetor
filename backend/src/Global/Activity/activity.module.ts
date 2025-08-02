import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Module({
  providers: [ActivityService],
  exports: [ActivityService], // So it can be injected in other modules
})
export class ActivityModule {}
