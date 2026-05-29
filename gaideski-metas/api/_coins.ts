import type { CoinConfig } from './schema'

export function calcWeeklyCoins(
  cfg: CoinConfig,
  punctual: boolean,
  attended: boolean,
  sport: boolean,
  workMonitorPct: number | null,
  taskProcessPct: number | null
): number {
  let coins = 0
  if (punctual) coins += Number(cfg.punctualityCoinsPerWeek)
  if (attended) coins += Number(cfg.attendanceCoinsPerWeek)
  if (sport)    coins += Number(cfg.sportCoinsPerEntry)
  if (workMonitorPct !== null && workMonitorPct !== undefined) {
    coins += (workMonitorPct / Number(cfg.workMonitorMaxScore)) * Number(cfg.workMonitorMaxCoins)
  }
  if (taskProcessPct !== null && taskProcessPct !== undefined) {
    coins += (taskProcessPct / Number(cfg.taskProcessMaxScore)) * Number(cfg.taskProcessMaxCoins)
  }
  return Math.round(coins * 100) / 100
}

export function calcQuizCoins(cfg: CoinConfig, score: number): { passed: boolean; coins: number } {
  const passed = score >= Number(cfg.quizPassScore)
  const coins  = passed ? Number(cfg.quizCoinsOnPass) : 0
  return { passed, coins }
}
