import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, X, Pencil, UserX } from 'lucide-react'

interface User { id: number; name: string; email: string; role: string; active: boolean }

const emptyForm = { name: '', email: '', password: '', role: 'supervisor' }

export default function UsuariosPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users'),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/users', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); close() },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.put(`/users/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); close() },
  })
  const deactivateMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  function openCreate() { setEditing(null); setForm({ ...emptyForm }); setShowForm(true) }
  function openEdit(u: User) { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setShowForm(true) }
  function close() { setShowForm(false); setEditing(null); setForm({ ...emptyForm }) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) {
      const payload: any = { id: editing.id, name: form.name, email: form.email, role: form.role }
      if (form.password) payload.password = form.password
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Administradores e supervisores do sistema</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all">
          <Plus size={15} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={close} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { key: 'name',  label: 'Nome',  type: 'text',     required: true },
                { key: 'email', label: 'E-mail', type: 'email',   required: true },
                { key: 'password', label: editing ? 'Nova Senha (deixe vazio para não alterar)' : 'Senha', type: 'password', required: !editing },
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({...p, [key]: e.target.value}))} required={required}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Perfil</label>
                <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
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
              {['Nome','E-mail','Perfil','Status','Ações'].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h==='Ações'?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>}
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.role==='admin' ? 'bg-amber-400/10 text-amber-400' : 'bg-blue-400/10 text-blue-400'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Supervisor'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.active ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                    {u.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => deactivateMutation.mutate(u.id)} className="text-muted-foreground hover:text-red-400 p-1 rounded transition-colors"><UserX size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
