import type { ExportCsvParams } from '../api/model';

/**
 * Filtros de exportação. Os 3 formatos (csv/json/excel) partilham os mesmos
 * query params no backend, por isso derivamos do tipo gerado.
 */
export type ExportFilters = ExportCsvParams;
