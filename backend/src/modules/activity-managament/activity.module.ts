import { Module } from "@nestjs/common";
import { ActivityManagementService } from "./activity.service";

@Module({
    providers:[ActivityManagementService],
})
export class ActivityManagmentModule {}