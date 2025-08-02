import { Module } from "@nestjs/common";
import { StockoutController } from "./stockout.controller";
import { StockoutService } from "./stockout.service";
import { ActivityManagementService } from "../activity-managament/activity.service";

@Module({
    controllers:[StockoutController],
    providers: [StockoutService, ActivityManagementService]
})

export class StockoutModule {}