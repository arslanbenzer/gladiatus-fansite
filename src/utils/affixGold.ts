/**
 * Gold value formula for prefixes and suffixes.
 * Derived from known game data: base = C × level^1.1
 *   Suffix:  C = 2027
 *   Prefix:  C = 2534  (~25% premium over suffixes)
 * Range: ±20% around base.
 */

export function calcAffixGoldBase(level: number, type: 'prefix' | 'suffix'): number {
  if (!level || level <= 0) return 0;
  const C = type === 'prefix' ? 2534 : 2220;
  return Math.round(C * Math.pow(level, 1.1));
}

export function calcAffixGoldRange(level: number, type: 'prefix' | 'suffix'): { min: number; max: number } {
  const base = calcAffixGoldBase(level, type);
  return {
    min: Math.round(base * 0.51),
    max: Math.round(base * 1.21),
  };
}

export function formatGoldDots(value: number): string {
  return value.toString().replaceAll(/\B(?=(\d{3})+(?!\d))/g, '.');
}
