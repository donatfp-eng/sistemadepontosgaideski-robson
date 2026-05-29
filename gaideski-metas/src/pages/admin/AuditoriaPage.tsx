import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AuditoriaPage() {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const { data, isLoading } = useQuery<any>({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get(`/audit-logs?page=${page}&limit=50`),
  })

  function toggle(id: number) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{total} ações registradas</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="w-6 px-4 py-3"></th>
              {['Data/Hora','Usuário','Ação','Entidade'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Carregando...</td></tr>}
            {logs.map((log: any, i: number) => (
              <>
                <tr key={log.id} onClick={() => toggle(log.id)} className={`border-b border-border/50 hover:bg-secondary/20 cursor-pointer ${i%2===0?'':'bg-secondary/10'}`}>
                  <td className="px-4 py-3 text-muted-foreground">
                    {expanded.has(log.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {format(new Date(log.createdAt), 'dd/MM/yy HH:mm', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.userName ?? '–'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-amber-400">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.entity ?? '–'} {log.entityId ? `#${log.entityId}` : ''}</td>
                </tr>
                {expanded.has(log.id) && (
                  <tr key={`${log.id}-detail`} className="border-b border-border/50 bg-secondary/5">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-muted-foreground mb-1 font-sans font-medium">Antes</p>
                          <pre className="bg-secondary p-3 rounded-lg text-green-400 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                            {log.before ? JSON.stringify(log.before, null, 2) : 'null'}
                          </pre>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1 font-sans font-medium">Depois</p>
                          <pre className="bg-secondary p-3 rounded-lg text-blue-400 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                            {log.after ? JSON.stringify(log.after, null, 2) : 'null'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {logs.length === 0 && !isLoading && <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum log ainda.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">← Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">Próxima →</button>
        </div>
      )}
    </div>
  )
}
