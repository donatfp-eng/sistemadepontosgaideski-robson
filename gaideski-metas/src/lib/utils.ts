import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fmtDate(date: string | Date) {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function fmtCoins(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function currentWeek() {
  const now  = new Date()
  const mon  = startOfWeek(now, { weekStartsOn: 1 })
  const sun  = endOfWeek(now,   { weekStartsOn: 1 })
  return {
    start: format(mon, 'yyyy-MM-dd'),
    end:   format(sun, 'yyyy-MM-dd'),
  }
}

export function medalEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `${rank}º`
}
