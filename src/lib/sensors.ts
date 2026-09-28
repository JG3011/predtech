// Shared sensor metadata + types used by both client and server code.

export type VariableKey = 'corrente' | 'temperatura' | 'vibracao' | 'rotacao'

export type Status = 'normal' | 'attention' | 'alarm'

export interface VariableMeta {
  key: VariableKey
  label: string
  unit: string
}

export const VARIABLES: VariableMeta[] = [
  { key: 'corrente', label: 'Corrente', unit: 'A' },
  { key: 'temperatura', label: 'Temperatura', unit: '°C' },
  { key: 'vibracao', label: 'Vibração', unit: 'mm/s' },
  { key: 'rotacao', label: 'Rotação', unit: 'RPM' },
]

export const DEFAULT_RANGES: Record<
  VariableKey,
  { min: number; max: number; attention: number }
> = {
  corrente: { min: 8, max: 18, attention: 2 },
  temperatura: { min: 20, max: 75, attention: 8 },
  vibracao: { min: 0, max: 7, attention: 1.5 },
  rotacao: { min: 1400, max: 1800, attention: 100 },
}

export interface RangeConfig {
  min: number
  max: number
  attention: number
}

export type RangesMap = Record<VariableKey, RangeConfig>

export function computeStatus(
  value: number,
  range: RangeConfig,
): Status {
  if (value < range.min || value > range.max) return 'alarm'
  if (value <= range.min + range.attention || value >= range.max - range.attention) {
    return 'attention'
  }
  return 'normal'
}

export const STATUS_LABEL: Record<Status, string> = {
  normal: 'Normal',
  attention: 'Atenção',
  alarm: 'Alarme',
}

export interface ReadingRow {
  id: number
  corrente: number
  temperatura: number
  vibracao: number
  rotacao: number
  createdAt: string
}
