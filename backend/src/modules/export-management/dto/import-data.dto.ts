export class ImportDataDto {
  version: string;
  system: string;
  data: Record<string, any[]>;
}

export class EntityImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

export class ImportResultDto {
  summary: {
    totalProcessed: number;
    created: number;
    skipped: number;
    errors: number;
  };
  details: Record<string, EntityImportResult>;
}
