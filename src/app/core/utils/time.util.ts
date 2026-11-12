/** Formatação de intervalos e datas relativas em português (pt-PT). */

/** 10080 → "semanal", 1440 → "diário", 90 → "a cada 1 h 30 min"… */
export function formatInterval(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `a cada ${minutes} min`;

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    if (days === 1) return 'diário';
    if (days === 7) return 'semanal';
    if (days === 14) return 'quinzenal';
    return `a cada ${days} dias`;
  }

  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return hours === 1 ? 'a cada hora' : `a cada ${hours} h`;
  return `a cada ${hours} h ${rem} min`;
}

/** Data passada em relação a agora: "há 5 min", "há 2 h", "há 3 dias"… */
export function formatRelativePast(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '—';

  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? 'há 1 semana' : `há ${weeks} semanas`;
  }
  return date.toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' });
}

/** Próxima execução: "agora", "daqui a 20 min", "daqui a 3 h", ou data curta. */
export function formatNextRun(iso: string | null | undefined): string {
  if (!iso) return 'em breve';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'em breve';

  const mins = Math.round((date.getTime() - Date.now()) / 60_000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `daqui a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `daqui a ${hours} h`;
  return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}
