import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fmtCoins, fmtBRL, medalEmoji } from '@/lib/utils'
import { Users, Coins, Trophy, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

interface RankingItem {
  rank: number
  employeeId: number
  employeeName: string
  sectorName: string
  supervisorName: string
  totalCoins: number
  accumulatedCoins: number
  coinValueBrl: number
  breakdown: {
    punctuality: number; attendance: number; sport: number
    quiz: number; taskProcess: number; workMonitor: number
    candidateReferrals: number; clientReferrals: number
  }
}

interface Summary {
  totalEmployees: number
  totalSectors: number
  totalCoinsDistributed: number
  totalValueBrl: number
  currentWeek: { start: string; end: string }
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear()

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const { data: summary } = useQuery<Summary>({
    queryKey: ['ranking-summary'],
    queryFn: () => api.get('/ranking/summary'),
  })
  const { data: ranking = [], isLoading } = useQuery<RankingItem[]>({
    queryKey: ['ranking', month, year],
    queryFn: () => api.get(`/ranking?month=${month}&year=${year}`),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Ranking e desempenho da equipe</p>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 self-start sm:self-auto">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-36 text-center">
            {MONTHS[month - 1]} {year}
            {isCurrentMonth && <span className="ml-1.5 text-xs font-normal text-amber-400">Atual</span>}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Colaboradores',       value: summary?.totalEmployees ?? '–',                 icon: Users,     color: 'text-blue-400' },
          { label: 'Moedas Distribuídas', value: fmtCoins(summary?.totalCoinsDistributed ?? 0),  icon: Coins,     color: 'text-amber-400' },
          { label: 'Valor Total (R$)',     value: fmtBRL(summary?.totalValueBrl ?? 0),            icon: TrendingUp, color: 'text-green-400' },
          { label: 'Líder do Mês',         value: ranking[0]?.employeeName ?? '–',               icon: Trophy,    color: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className="text-xl font-bold text-foreground truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Ranking Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">
            Ranking — {MONTHS[month - 1]} {year}
          </h2>
          {!isCurrentMonth && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">Histórico</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="sticky-col text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">#</th>
                <th className="sticky-col-2 text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-40">Colaborador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moedas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acumulado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor R$</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pont.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assid.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Esporte</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monitor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quiz</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ind.Cli.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ind.Col.</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={14} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>
              )}
              {!isLoading && ranking.length === 0 && (
                <tr><td colSpan={14} className="text-center py-12 text-muted-foreground">Nenhum dado para {MONTHS[month - 1]} {year}.</td></tr>
              )}
              {ranking.map((row, i) => (
                <tr key={row.employeeId} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="sticky-col px-4 py-3 font-mono text-sm">{medalEmoji(row.rank)}</td>
                  <td className="sticky-col-2 px-4 py-3 font-medium text-foreground">{row.employeeName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.sectorName ?? '–'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="coin-badge">{fmtCoins(row.totalCoins)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.accumulatedCoins)}</td>
                  <td className="px-4 py-3 text-right text-green-400 font-medium">{fmtBRL(row.totalCoins * row.coinValueBrl)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.punctuality)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.attendance)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.sport)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.workMonitor)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.taskProcess)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.quiz)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.clientReferrals)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fmtCoins(row.breakdown.candidateReferrals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
