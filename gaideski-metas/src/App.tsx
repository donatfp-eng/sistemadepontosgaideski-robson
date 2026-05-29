import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import TVPage from '@/pages/TVPage'
import LancamentoSemanalPage from '@/pages/supervisor/LancamentoSemanalPage'
import FechamentoMensalPage from '@/pages/supervisor/FechamentoMensalPage'
import QuizPage from '@/pages/supervisor/QuizPage'
import IndicacoesPage from '@/pages/supervisor/IndicacoesPage'
import UsuariosPage from '@/pages/admin/UsuariosPage'
import SetoresPage from '@/pages/admin/SetoresPage'
import ColaboradoresPage from '@/pages/admin/ColaboradoresPage'
import ConfiguracoesPage from '@/pages/admin/ConfiguracoesPage'
import AuditoriaPage from '@/pages/admin/AuditoriaPage'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tv"    element={<TVPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="supervisor/lancamento-semanal" element={<LancamentoSemanalPage />} />
          <Route path="supervisor/fechamento-mensal"  element={<FechamentoMensalPage />} />
          <Route path="supervisor/quiz"               element={<QuizPage />} />
          <Route path="supervisor/indicacoes"         element={<IndicacoesPage />} />
          <Route path="admin/usuarios"     element={<ProtectedRoute adminOnly><UsuariosPage /></ProtectedRoute>} />
          <Route path="admin/setores"      element={<ProtectedRoute adminOnly><SetoresPage /></ProtectedRoute>} />
          <Route path="admin/colaboradores" element={<ProtectedRoute adminOnly><ColaboradoresPage /></ProtectedRoute>} />
          <Route path="admin/configuracoes" element={<ProtectedRoute adminOnly><ConfiguracoesPage /></ProtectedRoute>} />
          <Route path="admin/auditoria"    element={<ProtectedRoute adminOnly><AuditoriaPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
