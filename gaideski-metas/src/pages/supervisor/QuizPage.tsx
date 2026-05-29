import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Save, CheckCircle, XCircle } from 'lucide-react'

interface TeamEmployee { id: number; name: string; sectorName: string }

export default function QuizPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [scores, setScores] = useState<Record<number, string>>({})
  const [notes,  setNotes]  = useState<Record<number, string>>({})
  const [saved,  setSaved]  = useState(false)

  const { data: team = [] } = useQuery<TeamEmployee[]>({
    queryKey: ['my-team'],
    queryFn: () => api.get('/supervisors/my-team'),
  })

  const { data: cfg } = useQuery<any>({
    queryKey: ['coin-config'],
    queryFn: () => api.get('/coin-config'),
  })

  const { data: existing = [] } = useQuery<any[]>({
    queryKey: ['quiz-entries', year, month],
    queryFn: () => api.get(`/quiz-entries?month=${month}&year=${year}`),
  })

  useEffect(() => {
    const sc: Record<number, string> = {}
    const nt: Record<number, string> = {}
    for (const emp of team) {
      const ex = existing.find((e: any) => e.employeeId === emp.id)
      sc[emp.id] = ex ? String(ex.score) : ''
      nt[emp.id] = ex?.notes ?? ''
    }
    setScores(sc); setNotes(nt)
  }, [team, existing])

  const mutation = useMutation({
    mutationFn: (entry: any) => api.post('/quiz-entries', entry),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quiz-entries'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  async function handleSaveAll() {
    for (const emp of team) {
      if (scores[emp.id] !== '') {
        await mutation.mutateAsync({
          employeeId: emp.id, month, year,
          score: Number(scores[emp.id]),
          notes: notes[emp.id] || null,
        })
      }
    }
  }

  const passScore = Number(cfg?.quizPassScore ?? 7)
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quiz Mensal</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Nota de corte: <strong className="text-amber-400">{passScore}</strong></p>
        </div>
        <button onClick={handleSaveAll} disabled={mutation.isPending}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
          <Save size={15} />
          {mutation.isPending ? 'Salvando...' : saved ? '✓ Salvo!' : 'Salvar Quiz'}
        </button>
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nota (0–10)</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resultado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</th>
            </tr>
          </thead>
          <tbody>
            {team.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum colaborador na equipe.</td></tr>
            )}
            {team.map((emp, i) => {
              const score  = scores[emp.id] !== '' ? Number(scores[emp.id]) : null
              const passed = score !== null ? score >= passScore : null
              return (
                <tr key={emp.id} className={`border-b border-border/50 hover:bg-secondary/20 transition-colors ${i%2===0?'':'bg-secondary/10'}`}>
                  <td className="px-4 py-3 font-medium text-foreground">{emp.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.sectorName}</td>
                  <td className="px-4 py-3 text-center">
                    <input type="number" min={0} max={10} step={0.1} value={scores[emp.id] ?? ''}
                      onChange={e => setScores(p => ({...p, [emp.id]: e.target.value}))}
                      placeholder="–"
                      className="w-20 bg-input border border-border rounded px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {passed === null ? <span className="text-muted-foreground">–</span>
                      : passed
                        ? <span className="inline-flex items-center gap-1 text-green-400 font-medium text-xs"><CheckCircle size={14} />Aprovado</span>
                        : <span className="inline-flex items-center gap-1 text-red-400 font-medium text-xs"><XCircle size={14} />Reprovado</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={notes[emp.id] ?? ''} onChange={e => setNotes(p => ({...p, [emp.id]: e.target.value}))}
                      placeholder="Opcional..."
                      className="w-full bg-input border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
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
