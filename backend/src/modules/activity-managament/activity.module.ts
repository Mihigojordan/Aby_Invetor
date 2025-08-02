import { Module } from "@nestjs/common";
import { ActivityManagementService } from "../activity-managament/activity.service";

@Module({
    providers:[ActivityManagementService],
})
export class ActivityManagmentModule {}