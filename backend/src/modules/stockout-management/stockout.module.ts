import { Module } from "@nestjs/common";
import { StockoutController } from "./stockout.controller";
import { StockoutService } from "./stockout.service";
import { ActivityManagementService } from "../activity-managament/activity.service";
import { BackOrderManagementService } from "../backorder-management/backorder-management.service";
import { IdempotencyService } from "src/common/idempotency/idempotency.service";

@Module({
    controllers:[StockoutController],
    providers: [StockoutService, ActivityManagementService, BackOrderManagementService, IdempotencyService]
})

export class StockoutModule {}