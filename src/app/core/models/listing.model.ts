import type { ListListingsParams } from '../api/model';

/**
 * Filtros da listagem de anúncios.
 *
 * Deriva diretamente de `ListListingsParams` (gerado do OpenAPI) para que qualquer
 * alteração de contrato no backend apareça aqui como erro de compilação.
 * `bedrooms` é o único campo só do frontend (match exato) — é convertido em
 * `bedrooms_min`/`bedrooms_max` por `RealEstateService` e nunca vai no query string.
 */
export type RealEstateFilters = ListListingsParams & {
  bedrooms?: number;
};
