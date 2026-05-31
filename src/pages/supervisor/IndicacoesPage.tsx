import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

interface Employee { id: number; name: string }

const STATUS_CANDIDATO = ['pendente','em_processo','aprovado','reprovado']
const STATUS_CLIENTE   = ['pendente','em_negociacao','contrato_fechado','perdido']

const statusLabel: Record<string, string> = {
  pendente: 'Pendente', em_processo: 'Em Processo', aprovado: 'Aprovado', reprovado: 'Reprovado',
  em_negociacao: 'Em Negociação', contrato_fechado: 'Contrato Fechado', perdido: 'Perdido',
}
const statusColor: Record<string, string> = {
  pendente: 'text-yellow-400 bg-yellow-400/10', em_processo: 'text-blue-400 bg-blue-400/10',
  aprovado: 'text-green-400 bg-green-400/10', reprovado: 'text-red-400 bg-red-400/10',
  em_negociacao: 'text-blue-400 bg-blue-400/10', contrato_fechado: 'text-green-400 bg-green-400/10',
  perdido: 'text-red-400 bg-red-400/10',
}

export default function IndicacoesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'candidatos'|'clientes'>('candidatos')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Record<string,string>>({})

  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ['employees'], queryFn: () => api.get('/employees') })
  const { data: candidatos = [] } = useQuery<any[]>({ queryKey: ['candidate-referrals'], queryFn: () => api.get('/candidate-referrals') })
  const { data: clientes   = [] } = useQuery<any[]>({ queryKey: ['client-referrals'],    queryFn: () => api.get('/client-referrals') })

  const addCandidato = useMutation({
    mutationFn: (d: any) => api.post('/candidate-referrals', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['candidate-referrals'] }); setShowForm(false); setForm({}) },
  })
  const addCliente = useMutation({
    mutationFn: (d: any) => api.post('/client-referrals', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['client-referrals'] }); setShowForm(false); setForm({}) },
  })
  const updCandidato = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/candidate-referrals/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate-referrals'] }),
  })
  const updCliente = useMutation({
    mutationFn: ({ id, status }: any) => api.put(`/client-referrals/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-referrals'] }),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (tab === 'candidatos') {
      addCandidato.mutate({ employeeId: Number(form.employeeId), candidateName: form.name, referralDate: form.date, position: form.position, status: 'pendente' })
    } else {
      addCliente.mutate({ employeeId: Number(form.employeeId), clientName: form.name, referralDate: form.date, status: 'pendente' })
    }
  }

  const empMap = new Map(employees.map((e: Employee) => [e.id, e.name]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Indicações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Candidatos e clientes indicados pela equipe</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all">
          <Plus size={15} /> Nova Indicação
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 border border-border rounded-xl p-1 w-fit">
        {(['candidatos','clientes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab===t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'candidatos' ? '👥 Candidatos' : '🤝 Clientes'}
          </button>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Nova Indicação — {tab === 'candidatos' ? 'Candidato' : 'Cliente'}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Colaborador</label>
                <select value={form.employeeId ?? ''} onChange={e => setForm(p => ({...p, employeeId: e.target.value}))} required
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option>
                  {employees.map((emp: Employee) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  {tab === 'candidatos' ? 'Nome do Candidato' : 'Nome do Cliente'}
                </label>
                <input type="text" value={form.name ?? ''} onChange={e => setForm(p => ({...p, name: e.target.value}))} required
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              {tab === 'candidatos' && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Cargo</label>
                  <input type="text" value={form.position ?? ''} onChange={e => setForm(p => ({...p, position: e.target.value}))} required
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Data da Indicação</label>
                <input type="date" value={form.date ?? ''} onChange={e => setForm(p => ({...p, date: e.target.value}))} required
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-sm transition-colors">Cancelar</button>
                <button type="submit" disabled={addCandidato.isPending || addCliente.isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg text-sm transition-all disabled:opacity-50">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {tab === 'candidatos' ? 'Candidato' : 'Cliente'}
              </th>
              {tab === 'candidatos' && <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cargo</th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moedas</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'candidatos' && candidatos.map((r: any, i: number) => (
              <tr key={r.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium text-foreground">{empMap.get(r.employeeId) ?? '–'}</td>
                <td className="px-4 py-3 text-foreground">{r.candidateName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.position}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.referralDate)}</td>
                <td className="px-4 py-3">
                  <select value={r.status} onChange={e => updCandidato.mutate({ id: r.id, status: e.target.value })}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${statusColor[r.status] ?? ''}`}>
                    {STATUS_CANDIDATO.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right"><span className="coin-badge">{r.coins}</span></td>
              </tr>
            ))}
            {tab === 'clientes' && clientes.map((r: any, i: number) => (
              <tr key={r.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium text-foreground">{empMap.get(r.employeeId) ?? '–'}</td>
                <td className="px-4 py-3 text-foreground">{r.clientName}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.referralDate)}</td>
                <td className="px-4 py-3">
                  <select value={r.status} onChange={e => updCliente.mutate({ id: r.id, status: e.target.value })}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${statusColor[r.status] ?? ''}`}>
                    {STATUS_CLIENTE.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-right"><span className="coin-badge">{r.coins}</span></td>
              </tr>
            ))}
            {((tab === 'candidatos' && candidatos.length === 0) || (tab === 'clientes' && clientes.length === 0)) && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhuma indicação ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
