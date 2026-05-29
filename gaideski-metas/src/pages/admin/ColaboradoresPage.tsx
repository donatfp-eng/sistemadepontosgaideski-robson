import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, X, Pencil, UserX } from 'lucide-react'

const emptyForm = { name: '', email: '', role: '', sectorId: '', supervisorId: '' }

export default function ColaboradoresPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const { data: employees = [], isLoading } = useQuery<any[]>({ queryKey: ['employees'], queryFn: () => api.get('/employees') })
  const { data: sectors = [] }   = useQuery<any[]>({ queryKey: ['sectors'],     queryFn: () => api.get('/sectors') })
  const { data: supervisors = [] } = useQuery<any[]>({ queryKey: ['supervisors'], queryFn: () => api.get('/supervisors') })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/employees', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/employees/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); close() },
  })
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(e: any) {
    setEditing(e)
    setForm({ name: e.name, email: e.email, role: e.role, sectorId: String(e.sectorId ?? ''), supervisorId: String(e.supervisorId ?? '') })
    setShowForm(true)
  }
  function close() { setShowForm(false); setEditing(null); setForm({ ...emptyForm }) }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const payload = {
      name: form.name, email: form.email, role: form.role,
      sectorId:    form.sectorId    ? Number(form.sectorId)    : null,
      supervisorId: form.supervisorId ? Number(form.supervisorId) : null,
    }
    if (editing) updateMutation.mutate({ id: editing.id, ...payload })
    else          createMutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gerencie os colaboradores da empresa</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all">
          <Plus size={15} /> Novo Colaborador
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editing ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { key: 'name',  label: 'Nome',          type: 'text'  },
                { key: 'email', label: 'E-mail',         type: 'email' },
                { key: 'role',  label: 'Cargo / Função', type: 'text'  },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} required
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Setor</label>
                <select value={form.sectorId} onChange={e => setForm(p => ({...p, sectorId: e.target.value}))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sem setor</option>
                  {sectors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Supervisor</label>
                <select value={form.supervisorId} onChange={e => setForm(p => ({...p, supervisorId: e.target.value}))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Sem supervisor</option>
                  {supervisors.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={close} className="flex-1 border border-border text-muted-foreground hover:text-foreground py-2 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg text-sm disabled:opacity-50">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['Nome','Cargo','Setor','Supervisor','Ações'].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h==='Ações'?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>}
            {employees.map((e: any, i: number) => (
              <tr key={e.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium text-foreground">{e.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.role}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.sectorName ?? '–'}</td>
                <td className="px-4 py-3 text-muted-foreground">{e.supervisorName ?? '–'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(e)} className="text-muted-foreground hover:text-foreground p-1 rounded"><Pencil size={14} /></button>
                    <button onClick={() => deactivateMutation.mutate(e.id)} className="text-muted-foreground hover:text-red-400 p-1 rounded"><UserX size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {employees.length === 0 && !isLoading && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum colaborador.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
