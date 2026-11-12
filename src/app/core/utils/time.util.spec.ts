import { formatInterval, formatNextRun, formatRelativePast } from './time.util';

describe('formatInterval', () => {
  it('usa nomes naturais para periodicidades comuns', () => {
    expect(formatInterval(1440)).toBe('diário');
    expect(formatInterval(10080)).toBe('semanal');
    expect(formatInterval(20160)).toBe('quinzenal');
  });

  it('formata minutos, horas e combinações', () => {
    expect(formatInterval(30)).toBe('a cada 30 min');
    expect(formatInterval(60)).toBe('a cada hora');
    expect(formatInterval(360)).toBe('a cada 6 h');
    expect(formatInterval(90)).toBe('a cada 1 h 30 min');
    expect(formatInterval(4320)).toBe('a cada 3 dias');
  });

  it('devolve vazio sem valor', () => {
    expect(formatInterval(null)).toBe('');
    expect(formatInterval(undefined)).toBe('');
    expect(formatInterval(0)).toBe('');
  });
});

describe('formatRelativePast', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('formata datas recentes em português', () => {
    expect(formatRelativePast(ago(10_000))).toBe('agora mesmo');
    expect(formatRelativePast(ago(5 * 60_000))).toBe('há 5 min');
    expect(formatRelativePast(ago(3 * 3_600_000))).toBe('há 3 h');
    expect(formatRelativePast(ago(25 * 3_600_000))).toBe('ontem');
    expect(formatRelativePast(ago(3 * 86_400_000))).toBe('há 3 dias');
    expect(formatRelativePast(ago(14 * 86_400_000))).toBe('há 2 semanas');
  });

  it('tolera valores inválidos', () => {
    expect(formatRelativePast(null)).toBe('—');
    expect(formatRelativePast('não é data')).toBe('—');
  });
});

describe('formatNextRun', () => {
  const inMs = (ms: number) => new Date(Date.now() + ms).toISOString();

  it('descreve a próxima execução', () => {
    expect(formatNextRun(null)).toBe('em breve');
    expect(formatNextRun(inMs(-1000))).toBe('agora');
    expect(formatNextRun(inMs(20 * 60_000 + 5_000))).toBe('daqui a 20 min');
    expect(formatNextRun(inMs(3 * 3_600_000 + 60_000))).toBe('daqui a 3 h');
  });
});
