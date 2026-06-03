import { useEffect, useState, useRef } from 'react'

interface TVEmployee {
  rank: number; employeeName: string; sectorName: string; monthCoins: number
}
interface TVData {
  month: number; year: number; employees: TVEmployee[]; coinValueBrl: number
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function getUrlParams() {
  const p = new URLSearchParams(window.location.search)
  const now = new Date()
  return {
    month: p.has('month') ? Number(p.get('month')) : now.getMonth() + 1,
    year:  p.has('year')  ? Number(p.get('year'))  : now.getFullYear(),
  }
}

export default function TVPage() {
  const [data, setData] = useState<TVData | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPos = useRef(0)
  const scrollDir = useRef(1)

  async function load() {
    try {
      const { month, year } = getUrlParams()
      const r = await fetch(`/api/ranking/tv?month=${month}&year=${year}`)
      if (r.ok) setData(await r.json())
    } catch {}
  }

  useEffect(() => { load(); const t = setInterval(() => { load() }, 30000); return () => clearInterval(t) }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !data || data.employees.length <= 10) return
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
  const maxCoins = Math.max(...data.employees.map(e => e.monthCoins), 1)

  const sectorMap = new Map<string, { coins: number; leader: string }>()
  for (const emp of data.employees) {
    const s = sectorMap.get(emp.sectorName)
    if (!s || emp.monthCoins > s.coins) sectorMap.set(emp.sectorName, { coins: emp.monthCoins, leader: emp.employeeName })
  }
  const sectors = Array.from(sectorMap.entries()).sort((a, b) => b[1].coins - a[1].coins)
  const maxSectorCoins = Math.max(...sectors.map(s => s[1].coins), 1)
  const sectorColors = ['#F59E0B','#3B82F6','#10B981','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899']

  // Pódio: [2º, 1º, 3º]
  const podiumOrder = [top3[1], top3[0], top3[2]]
  const podiumHeights = ['70px', '100px', '55px']
  const podiumIcons = ['🥈','🥇','🥉']
  const podiumColors = ['from-slate-400 to-slate-500','from-amber-400 to-amber-600','from-amber-700 to-amber-800']

  const now = new Date()
  const isCurrentMonth = data.month === now.getMonth() + 1 && data.year === now.getFullYear()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" style={{ fontFamily: 'Sora, sans-serif' }}>
      {/* Header */}
      <div className="px-8 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-lg">G</div>
          <div>
            <p className="font-bold text-lg leading-tight">Gaideski Contabilidade</p>
            <p className="text-xs text-slate-400">Sistema de Gamificação</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-amber-400 font-bold text-lg">
            {MONTHS[data.month - 1]} {data.year}
            {!isCurrentMonth && <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">Histórico</span>}
          </p>
          <p className="text-xs text-slate-400">{isCurrentMonth ? 'Atualiza a cada 30s' : 'Mês encerrado'}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4" style={{ minHeight: 0 }}>
        {/* Coluna esquerda: Pódio + Ranking */}
        <div className="flex flex-col gap-4">
          {/* Pódio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">🏆 Pódio do Mês</h2>
            {/* Nomes acima das barras */}
            <div className="flex gap-3 mb-2">
              {podiumOrder.map((emp, idx) => (
                <div key={idx} className="flex-1 text-center">
                  {emp ? (
                    <>
                      <p className="text-lg leading-none mb-1">{podiumIcons[idx]}</p>
                      <p className={`font-bold leading-tight text-xs ${emp.rank === 1 ? 'text-amber-400' : 'text-slate-200'}`}
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {emp.employeeName}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{emp.sectorName}</p>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            {/* Barras do pódio */}
            <div className="flex items-end gap-3">
              {podiumOrder.map((emp, idx) => (
                <div key={idx} className="flex-1">
                  {emp ? (
                    <div className={`w-full bg-gradient-to-t ${podiumColors[idx]} rounded-t-lg flex items-end justify-center pb-1`}
                      style={{ height: podiumHeights[idx] }}>
                      <span className="text-xs font-bold text-slate-900">{emp.monthCoins.toFixed(1)}</span>
                    </div>
                  ) : <div style={{ height: podiumHeights[idx] }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Ranking Geral */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">📊 Ranking Geral</h2>
            <div ref={scrollRef} className="overflow-hidden space-y-2" style={{ maxHeight: '280px' }}>
              {data.employees.map(emp => (
                <div key={emp.rank} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-center shrink-0">
                    {emp.rank === 1 ? '🥇' : emp.rank === 2 ? '🥈' : emp.rank === 3 ? '🥉' : <span className="text-slate-500 text-xs">{emp.rank}º</span>}
                  </span>
                  <span className="text-xs font-medium w-36 truncate shrink-0">{emp.employeeName}</span>
                  <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.max((emp.monthCoins/maxCoins)*100, emp.monthCoins > 0 ? 2 : 0)}%`,
                        background: emp.monthCoins > 0 ? 'linear-gradient(90deg, #F59E0B, #D97706)' : '#334155'
                      }} />
                  </div>
                  <span className="text-xs text-amber-400 font-bold w-10 text-right shrink-0">{emp.monthCoins > 0 ? emp.monthCoins.toFixed(1) : '–'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita: Campeões por Setor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">🏢 Campeões por Setor</h2>
          <div className="flex flex-col gap-4">
            {sectors.map(([name, { coins, leader }], i) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: sectorColors[i % sectorColors.length] }}>{name}</span>
                  <span className="text-xs text-amber-400 font-bold">{coins.toFixed(1)} 🪙</span>
                </div>
                <p className="text-xs text-slate-400 mb-1 truncate">{leader}</p>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(coins/maxSectorCoins)*100}%`, background: sectorColors[i % sectorColors.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
