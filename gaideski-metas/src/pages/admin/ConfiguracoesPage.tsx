import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Save } from 'lucide-react'

const fields = [
  { key: 'punctualityCoinsPerWeek', label: 'Moedas por Pontualidade (semanal)'    },
  { key: 'attendanceCoinsPerWeek',  label: 'Moedas por Assiduidade (semanal)'     },
  { key: 'sportCoinsPerEntry',      label: 'Moedas por Esporte (semanal)'         },
  { key: 'quizPassScore',           label: 'Nota de Corte do Quiz'                },
  { key: 'quizCoinsOnPass',         label: 'Moedas ao Passar no Quiz'             },
  { key: 'workMonitorMaxScore',     label: 'Score Máximo — Monitor de Trabalho'   },
  { key: 'workMonitorMaxCoins',     label: 'Moedas Máximas — Monitor de Trabalho' },
  { key: 'taskProcessMaxScore',     label: 'Score Máximo — Tarefas/Processos'     },
  { key: 'taskProcessMaxCoins',     label: 'Moedas Máximas — Tarefas/Processos'  },
  { key: 'clientReferralCoins',     label: 'Moedas por Indicação de Cliente'      },
  { key: 'candidateReferralCoins',  label: 'Moedas por Indicação de Candidato'    },
  { key: 'coinValueBrl',            label: 'Valor de 1 Moeda (R$)'                },
  { key: 'quarterlyBonusPct',       label: 'Bônus Trimestral (%)'                 },
]

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string,string>>({})
  const [saved, setSaved] = useState(false)

  const { data: cfg } = useQuery<any>({ queryKey: ['coin-config'], queryFn: () => api.get('/coin-config') })

  useEffect(() => {
    if (cfg) {
      const f: Record<string,string> = {}
      for (const { key } of fields) f[key] = String(cfg[key] ?? '')
      setForm(f)
    }
  }, [cfg])

  const mutation = useMutation({
    mutationFn: (d: any) => api.put('/coin-config', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coin-config'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string,number> = {}
    for (const { key } of fields) payload[key] = Number(form[key])
    mutation.mutate(payload)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Regras de cálculo de moedas e bônus</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                <input
                  type="number" step="0.01" min="0"
                  value={form[key] ?? ''}
                  onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20">
              <Save size={15} />
              {mutation.isPending ? 'Salvando...' : saved ? '✓ Configurações salvas!' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
