import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Trash2 } from 'lucide-react'

interface Sector { id: number; name: string }

export default function SetoresPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')

  const { data: sectors = [], isLoading } = useQuery<Sector[]>({
    queryKey: ['sectors'],
    queryFn: () => api.get('/sectors'),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/sectors', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sectors'] }); setName('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/sectors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sectors'] }),
  })

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim() })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setores</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie os setores da empresa</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Nome do setor..." required
            className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
            <Plus size={15} /> Adicionar
          </button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setor</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={2} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>}
            {sectors.length === 0 && !isLoading && <tr><td colSpan={2} className="text-center py-12 text-muted-foreground">Nenhum setor cadastrado.</td></tr>}
            {sectors.map((s, i) => (
              <tr key={s.id} className={`border-b border-border/50 hover:bg-secondary/20 ${i%2===0?'':'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => deleteMutation.mutate(s.id)} className="text-muted-foreground hover:text-red-400 p-1 rounded transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
