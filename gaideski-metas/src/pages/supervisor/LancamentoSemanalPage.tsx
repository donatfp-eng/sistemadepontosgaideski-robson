import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { currentWeek, fmtCoins } from '@/lib/utils'
import { Save } from 'lucide-react'

interface TeamEmployee { id: number; name: string; sectorName: string }
interface WeeklyEntry { employeeId: number; punctual: boolean; attended: boolean; sport: boolean; taskProcessPct: number | null }

export default function LancamentoSemanalPage() {
  const qc = useQueryClient()
  const week = currentWeek()
  const [weekStart, setWeekStart] = useState(week.start)
  const [entries, setEntries] = useState<Record<number, WeeklyEntry>>({})
  const [saved, setSaved] = useState(false)

  const { data: team = [] } = useQuery<TeamEmployee[]>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/supervisors/my-team'),
  })

  const { data: existing = [] } = useQuery<any[]>({
    queryKey: ['weekly-entries', weekStart],
    queryFn: () => api.get(`/weekly-entries?weekStart=${weekStart}&weekEnd=${addDays(weekStart, 6)}`),
  })

  useEffect(() => {
    const map: Record<number, WeeklyEntry> = {}
    for (const emp of team) {
      const ex = existing.find((e: any) => e.employeeId === emp.id)
      map[emp.id] = ex ? {
        employeeId: emp.id, punctual: ex.punctual, attended: ex.attended,
        sport: ex.sport, taskProcessPct: ex.taskProcessPct != null ? Number(ex.taskProcessPct) : null,
      } : { employeeId: emp.id, punctual: false, attended: false, sport: false, taskProcessPct: null }
    }
    setEntries(map)
  }, [team, existing])

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/weekly-entries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-entries'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  function toggle(empId: number, field: 'punctual' | 'attended' | 'sport') {
    setEntries(prev => ({ ...prev, [empId]: { ...prev[empId], [field]: !prev[empId]?.[field] } }))
  }

  function setTaskPct(empId: number, val: string) {
    setEntries(prev => ({ ...prev, [empId]: { ...prev[empId], taskProcessPct: val === '' ? null : Number(val) } }))
  }

  function handleSave() {
    const weekEnd = addDays(weekStart, 6)
    mutation.mutate({ weekStart, weekEnd, entries: Object.values(entries) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lançamento Semanal</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Registre pontualidade, assiduidade, esporte e tarefas</p>
        </div>
        <button onClick={handleSave} disabled={mutation.isPending}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
          <Save size={15} />
          {mutation.isPending ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Semana'}
        </button>
      </div>

      {/* Week selector */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Semana (início)</label>
          <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="text-sm text-muted-foreground mt-5">→ Fim: <strong className="text-foreground">{addDays(weekStart, 6)}</strong></div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pontualidade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assiduidade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Esporte</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas %</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moedas</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum colaborador na equipe.</td></tr>
            )}
            {team.map((emp, i) => {
              const e = entries[emp.id]
              const coins = calcPreview(e)
              return (
                <tr key={emp.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.sectorName}</td>
                  {(['punctual', 'attended', 'sport'] as const).map(field => (
                    <td key={field} className="px-4 py-3 text-center">
                      <input type="checkbox" checked={e?.[field] ?? false} onChange={() => toggle(emp.id, field)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer" />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <input type="number" min={0} max={100} value={e?.taskProcessPct ?? ''} onChange={ev => setTaskPct(emp.id, ev.target.value)}
                      placeholder="–"
                      className="w-20 bg-input border border-border rounded px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="coin-badge">{fmtCoins(coins)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcPreview(e?: WeeklyEntry) {
  if (!e) return 0
  let c = 0
  if (e.punctual) c += 1
  if (e.attended) c += 1
  if (e.sport)    c += 1
  if (e.taskProcessPct != null) c += (e.taskProcessPct / 100) * 10
  return Math.round(c * 100) / 100
}
