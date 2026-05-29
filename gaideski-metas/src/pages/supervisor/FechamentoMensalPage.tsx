import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fmtCoins } from '@/lib/utils'
import { Save } from 'lucide-react'

interface TeamEmployee { id: number; name: string; sectorName: string }

export default function FechamentoMensalPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monitor,  setMonitor]  = useState<Record<number, string>>({})
  const [tarefas,  setTarefas]  = useState<Record<number, string>>({})
  const [savedMon, setSavedMon] = useState(false)
  const [savedTar, setSavedTar] = useState(false)

  const { data: team = [] } = useQuery<TeamEmployee[]>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/supervisors/my-team'),
  })

  // Load existing monthly entries
  const firstDay = `${year}-${String(month).padStart(2,'0')}-01`
  const { data: existing = [] } = useQuery<any[]>({
    queryKey: ['weekly-entries-monthly', year, month],
    queryFn: () => api.get(`/weekly-entries?weekStart=${firstDay}&weekEnd=${firstDay}`),
  })

  useEffect(() => {
    const mon: Record<number, string> = {}
    const tar: Record<number, string> = {}
    for (const emp of team) {
      const ex = existing.find((e: any) => e.employeeId === emp.id)
      mon[emp.id] = ex?.workMonitorPct  != null ? String(ex.workMonitorPct)  : ''
      tar[emp.id] = ex?.taskProcessPct  != null ? String(ex.taskProcessPct)  : ''
    }
    setMonitor(mon); setTarefas(tar)
  }, [team, existing])

  const monMutation = useMutation({
    mutationFn: (data: any) => api.post('/weekly-entries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-entries-monthly'] }); setSavedMon(true); setTimeout(() => setSavedMon(false), 2000) },
  })
  const tarMutation = useMutation({
    mutationFn: (data: any) => api.post('/weekly-entries', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['weekly-entries-monthly'] }); setSavedTar(true); setTimeout(() => setSavedTar(false), 2000) },
  })

  function saveMonitor() {
    monMutation.mutate({
      weekStart: firstDay, weekEnd: firstDay,
      entries: team.map(emp => ({
        employeeId: emp.id, punctual: false, attended: false, sport: false,
        workMonitorPct: monitor[emp.id] ? Number(monitor[emp.id]) : null,
        taskProcessPct: tarefas[emp.id] ? Number(tarefas[emp.id]) : null,
      })),
    })
  }

  function saveTarefas() {
    tarMutation.mutate({
      weekStart: firstDay, weekEnd: firstDay,
      entries: team.map(emp => ({
        employeeId: emp.id, punctual: false, attended: false, sport: false,
        workMonitorPct: monitor[emp.id] ? Number(monitor[emp.id]) : null,
        taskProcessPct: tarefas[emp.id] ? Number(tarefas[emp.id]) : null,
      })),
    })
  }

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fechamento Mensal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Registre Monitor de Trabalho % e Processos % mensal</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Mês</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Ano</label>
          <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} min={2020} max={2030}
            className="bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-foreground w-24 focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>

      {/* Monitor % */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Monitor de Trabalho % — {months[month-1]}/{year}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Percentual mensal de monitoramento</p>
          </div>
          <button onClick={saveMonitor} disabled={monMutation.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all">
            <Save size={14} /> {savedMon ? '✓ Salvo!' : 'Salvar Monitor'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-secondary/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monitor %</th>
          </tr></thead>
          <tbody>
            {team.map((emp, i) => (
              <tr key={emp.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3 text-center">
                  <input type="number" min={0} max={100} value={monitor[emp.id] ?? ''} onChange={e => setMonitor(p => ({...p, [emp.id]: e.target.value}))}
                    placeholder="–" className="w-24 bg-input border border-border rounded px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarefas/Processos % */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Tarefas / Processos % — {months[month-1]}/{year}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Percentual mensal de tarefas e processos</p>
          </div>
          <button onClick={saveTarefas} disabled={tarMutation.isPending}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all">
            <Save size={14} /> {savedTar ? '✓ Salvo!' : 'Salvar Tarefas'}
          </button>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-secondary/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarefas %</th>
          </tr></thead>
          <tbody>
            {team.map((emp, i) => (
              <tr key={emp.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3 text-center">
                  <input type="number" min={0} max={100} value={tarefas[emp.id] ?? ''} onChange={e => setTarefas(p => ({...p, [emp.id]: e.target.value}))}
                    placeholder="–" className="w-24 bg-input border border-border rounded px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
