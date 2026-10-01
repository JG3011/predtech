// Maintenance forecast model shared by server (computation) and client (explanation text).

/** Nominal interval between maintenances for a motor running in normal conditions. */
export const BASE_INTERVAL_DAYS = 30
/** Days the forecast moves earlier per alarm / attention event since the last maintenance. */
export const ALARM_WEIGHT_DAYS = 0.02
export const ATTENTION_WEIGHT_DAYS = 0.005
/** The forecast never moves earlier than this many days after the reference date. */
export const MIN_INTERVAL_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export function predictMaintenance(reference: Date, alarms: number, attentions: number): Date {
  const wear = alarms * ALARM_WEIGHT_DAYS + attentions * ATTENTION_WEIGHT_DAYS
  const days = Math.max(MIN_INTERVAL_DAYS, BASE_INTERVAL_DAYS - wear)
  return new Date(reference.getTime() + days * DAY_MS)
}
