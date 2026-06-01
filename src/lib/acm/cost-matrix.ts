import type { AcmConservacion, AcmTipo } from '@/types/acm';

export interface CostCell {
  min: number;
  mid: number;
  max: number;
}

// USD/m² for Paraguay 2025, +25% adjusted, rounded.
// Rows: conservacion  Columns: tipo
// Fix #9 — lujo conservacion now has entries for every tipo, not just 'lujo'.
export const COST_MATRIX: Record<AcmConservacion, Partial<Record<AcmTipo, CostCell>>> = {
  malo: {
    antiguo:   { min: 190, mid: 220, max: 250 },
    medio:     { min: 250, mid: 280, max: 310 },
    seminuevo: { min: 310, mid: 345, max: 380 },
    nuevo:     { min: 380, mid: 410, max: 440 },
  },
  regular: {
    antiguo:   { min: 250, mid: 280, max: 310 },
    medio:     { min: 310, mid: 345, max: 380 },
    seminuevo: { min: 380, mid: 410, max: 440 },
    nuevo:     { min: 440, mid: 470, max: 500 },
  },
  bueno: {
    antiguo:   { min: 310, mid: 345, max: 380 },
    medio:     { min: 380, mid: 410, max: 440 },
    seminuevo: { min: 440, mid: 470, max: 500 },
    nuevo:     { min: 500, mid: 530, max: 560 },
  },
  excelente: {
    antiguo:   { min: 380, mid: 410, max: 440 },
    medio:     { min: 440, mid: 470, max: 500 },
    seminuevo: { min: 500, mid: 530, max: 560 },
    nuevo:     { min: 560, mid: 595, max: 630 },
  },
  lujo: {
    antiguo:   { min: 440, mid: 480, max: 520 },
    medio:     { min: 500, mid: 545, max: 590 },
    seminuevo: { min: 560, mid: 610, max: 660 },
    nuevo:     { min: 620, mid: 670, max: 720 },
    lujo:      { min: 690, mid: 815, max: 940 },
  },
};

export function getTipo(yearBuilt: number): AcmTipo {
  if (yearBuilt < 1980) return 'antiguo';
  if (yearBuilt < 2000) return 'medio';
  if (yearBuilt < 2012) return 'seminuevo';
  return 'nuevo';
}

const CONSERVACION_PATTERNS: Array<[AcmConservacion, RegExp]> = [
  ['lujo',      /\b(lujo|premium|alta\s+gama)\b/i],
  ['excelente', /\b(impecable|como\s+nuevo|refaccionado|excelente\s+estado)\b/i],
  ['bueno',     /\b(muy\s+buen\s+estado|bien\s+conservado|conservado)\b/i],
  ['regular',   /\b(buen\s+estado|habitable)\b/i],
  ['malo',      /\b(para\s+refaccionar|refaccionar|necesita\s+trabajo|oportunidad)\b/i],
];

export function detectConservacion(description: string): AcmConservacion | undefined {
  for (const [level, pattern] of CONSERVACION_PATTERNS) {
    if (pattern.test(description)) return level;
  }
  return undefined;
}

export function getCostCell(
  conservacion: AcmConservacion,
  tipo: AcmTipo,
): CostCell | undefined {
  return COST_MATRIX[conservacion]?.[tipo];
}

export const CONSERVACION_LABELS: Record<AcmConservacion, string> = {
  malo:      'Malo',
  regular:   'Regular',
  bueno:     'Bueno',
  excelente: 'Excelente',
  lujo:      'Lujo',
};

export const TIPO_LABELS: Record<AcmTipo, string> = {
  antiguo:   'Antiguo (antes 1980)',
  medio:     'Medio (1980–2000)',
  seminuevo: 'Semi-nuevo (2000–2012)',
  nuevo:     'Nuevo (2012+)',
  lujo:      'Lujo',
};
