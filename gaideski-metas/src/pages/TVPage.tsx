import { useEffect, useState, useRef } from 'react'

interface TVEmployee {
  rank: number; employeeName: string; sectorName: string; monthCoins: number
}
interface TVData {
  month: number; year: number; employees: TVEmployee[]; coinValueBrl: number
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function TVPage() {
  const [data, setData] = useState<TVData | null>(null)
  const [tick, setTick] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)
  const scrollDir = useRef(1)

  async function load() {
    try {
      const r = await fetch('/api/ranking/tv')
      if (r.ok) setData(await r.json())
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(() => { load(); setTick(p => p+1) }, 30000); return () => clearInterval(t) }, [])

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !data || data.employees.length <= 8) return
    const interval = setInterval(() => {
      scrollPos.current += scrollDir.current * 1
      if (scrollPos.current >= el.scrollHeight - el.clientHeight) scrollDir.current = -1
      if (scrollPos.current <= 0) scrollDir.current = 1
      el.scrollTop = scrollPos.current
    }, 30)
    return () => clearInterval(interval)
  }, [data])

  if (!data) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-slate-400 text-xl font-light tracking-widest uppercase">Carregando ranking...</p>
      </div>
    </div>
  )

  const top3 = data.employees.slice(0, 3)
  const others = data.employees.slice(3)
  const maxCoins = Math.max(...data.employees.map(e => e.monthCoins), 1)

  // Group by sector for chart
  const sectorMap = new Map<string, { coins: number; leader: string }>()
  for (const emp of data.employees) {
    const sec = emp.sectorName ?? 'Sem Setor'
    const cur = sectorMap.get(sec)
    if (!cur || emp.monthCoins > cur.coins) sectorMap.set(sec, { coins: emp.monthCoins, leader: emp.employeeName })
  }
  const sectors = Array.from(sectorMap.entries()).sort((a, b) => b[1].coins - a[1].coins)
  const maxSectorCoins = Math.max(...sectors.map(s => s[1].coins), 1)

  const sectorColors = ['#F59E0B','#3B82F6','#10B981','#8B5CF6','#EF4444','#06B6D4']

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-lg">G</div>
          <div>
            <p className="font-bold text-lg leading-tight">Gaideski Contabilidade</p>
            <p className="text-xs text-slate-400">Sistema de Gamificação</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-amber-400 font-bold text-lg">{MONTHS[data.month - 1]} {data.year}</p>
          <p className="text-xs text-slate-400">Atualiza a cada 30s</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 p-6 h-[calc(50vh-60px)]">
        {/* Pódio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">🏆 Pódio do Mês</h2>
          <div className="flex items-end justify-center gap-4 flex-1">
            {[top3[1], top3[0], top3[2]].map((emp, idx) => {
              if (!emp) return <div key={idx} className="flex-1" />
              const isFirst = emp.rank === 1
              const heights = ['h-20','h-28','h-16']
              const icons   = ['🥈','🥇','🥉']
              const colors  = ['from-slate-400 to-slate-500','from-amber-400 to-amber-600','from-amber-700 to-amber-800']
              return (
                <div key={emp.rank} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-2xl">{icons[idx]}</p>
                  <p className={`font-bold text-center leading-tight ${isFirst ? 'text-amber-400 text-base' : 'text-slate-200 text-sm'}`}>{emp.employeeName}</p>
                  <p className="text-xs text-slate-400">{emp.sectorName}</p>
                  <div className={`w-full bg-gradient-to-t ${colors[idx]} rounded-t-lg flex items-end justify-center pb-2 ${heights[idx]}`}>
                    <span className="text-xs font-bold text-slate-900">{emp.monthCoins.toFixed(1)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {others.slice(0,3).map(emp => (
            <div key={emp.rank} className="flex items-center justify-between py-1.5 border-t border-slate-800 mt-1">
              <span className="text-slate-400 text-sm">{emp.rank}º {emp.employeeName}</span>
              <span className="coin-badge text-xs">{emp.monthCoins.toFixed(1)}</span>
            </div>
          ))}
        </div>

        {/* Campeões por Setor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">🏢 Campeões por Setor</h2>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {sectors.map(([name, { coins, leader }], i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: sectorColors[i % sectorColors.length] }}>{name}</span>
                  <span className="text-xs text-slate-400">{leader} · <strong className="text-white">{coins.toFixed(1)} 🪙</strong></span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(coins/maxSectorCoins)*100}%`, background: sectorColors[i % sectorColors.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranking geral */}
      <div className="px-6 pb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">📊 Ranking Geral</h2>
          <div ref={scrollRef} className="overflow-hidden max-h-40 space-y-2">
            {data.employees.map(emp => (
              <div key={emp.rank} className="flex items-center gap-3">
                <span className="text-sm w-6 text-center shrink-0">
                  {emp.rank === 1 ? '🥇' : emp.rank === 2 ? '🥈' : emp.rank === 3 ? '🥉' : <span className="text-slate-500 text-xs">{emp.rank}º</span>}
                </span>
                <span className="text-sm font-medium w-40 truncate shrink-0">{emp.employeeName}</span>
                <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.max((emp.monthCoins/maxCoins)*100, emp.monthCoins > 0 ? 2 : 0)}%`,
                      background: emp.monthCoins > 0 ? 'linear-gradient(90deg, #F59E0B, #D97706)' : '#334155'
                    }} />
                </div>
                <span className="text-xs text-amber-400 font-bold w-12 text-right shrink-0">{emp.monthCoins > 0 ? emp.monthCoins.toFixed(1) : '–'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
