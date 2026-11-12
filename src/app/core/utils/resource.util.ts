import type { ResourceRef } from '@angular/core';

/**
 * Lê o valor de um `rxResource` sem lançar exceção.
 *
 * `resource.value()` lança `ResourceValueError` quando o resource está em estado
 * de erro (ex.: backend em baixo), o que rebentava qualquer `computed()` que o
 * lesse — e a página ficava em branco. `hasValue()` é seguro nesse estado.
 */
export function safeValue<T>(resource: ResourceRef<T | undefined>): T | undefined {
  return resource.hasValue() ? resource.value() : undefined;
}
