import { Module } from "@nestjs/common";
import { StockoutController } from "./stockout.controller";
import { StockoutService } from "./stockout.service";

@Module({
    controllers:[StockoutController],
    providers: [StockoutService]
})

export class StockoutModule {}