import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

const VALID_ENTITIES = [
  'Category', 'Product', 'StockIn', 'StockOut', 'BackOrder',
  'SalesReturn', 'SalesReturnItem', 'Partner', 'Requisition',
  'RequisitionItem', 'RequisitionItemDelivery', 'StockRequisition',
  'StockRequisitionItem', 'ReceivingLog', 'Employee', 'Admin', 'Task',
  'Permission', 'Report', 'Expense', 'Transaction', 'Credit',
  'Activity', 'Notification',
];

export class DateRangeDto {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  end?: string;
}

export class EntityFiltersDto {
  StockOut?: { paymentStatus?: string[] };
  Expense?: { status?: string[] };
  Requisition?: { status?: string[] };
  StockRequisition?: { status?: string[] };
}

export class ExcludeFieldsDto {
  Employee?: string[];
  Admin?: string[];
  Partner?: string[];
}

export class ExportConfigDto {
  @IsArray()
  @IsIn(VALID_ENTITIES, { each: true })
  entities: string[];

  @IsOptional()
  dateRange?: DateRangeDto;

  @IsOptional()
  filters?: EntityFiltersDto;

  @IsOptional()
  excludeFields?: ExcludeFieldsDto;
}
