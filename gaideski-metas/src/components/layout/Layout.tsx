import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, CalendarCheck, BookOpen, Trophy, Users2,
  Settings, FileText, Building2, LogOut, Tv, UserCog, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const supervisorNav = [
  { to: '/dashboard',                      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/supervisor/lancamento-semanal',  icon: CalendarCheck,   label: 'Lançamento Semanal' },
  { to: '/supervisor/fechamento-mensal',   icon: BookOpen,        label: 'Fechamento Mensal' },
  { to: '/supervisor/quiz',                icon: Trophy,          label: 'Quiz Mensal' },
  { to: '/supervisor/indicacoes',          icon: Users2,          label: 'Indicações' },
]

const adminNav = [
  { to: '/admin/usuarios',      icon: UserCog,    label: 'Usuários' },
  { to: '/admin/setores',       icon: Building2,  label: 'Setores' },
  { to: '/admin/colaboradores', icon: Users2,     label: 'Colaboradores' },
  { to: '/admin/configuracoes', icon: Settings,   label: 'Configurações' },
  { to: '/admin/auditoria',     icon: FileText,   label: 'Auditoria' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-border bg-card/50 backdrop-blur-sm shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-900 font-black text-sm">G</div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Gaideski</p>
              <p className="text-[10px] text-muted-foreground">Metas & Gamificação</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">Supervisão</p>
          {supervisorNav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              isActive
                ? 'bg-primary/20 text-amber-400 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            )}>
              <Icon size={15} />
              {label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-3">Administração</p>
              {adminNav.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/20 text-amber-400 font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}>
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </>
          )}

          <div className="pt-2 border-t border-border mt-2">
            <NavLink to="/tv" target="_blank" className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Tv size={15} />
              Modo TV
            </NavLink>
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login') }} className="text-muted-foreground hover:text-destructive transition-colors p-1">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
