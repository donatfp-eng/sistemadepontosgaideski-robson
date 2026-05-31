import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'supervisor'
}

export function useAuth() {
  const qc = useQueryClient()

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['auth-me'],
    queryFn: () => api.get<AuthUser>('/auth/me').catch(() => null),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post<AuthUser>('/auth/login', creds),
    onSuccess: (data) => {
      qc.setQueryData(['auth-me'], data)
      qc.invalidateQueries()
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout', {}),
    onSuccess: () => {
      qc.setQueryData(['auth-me'], null)
      qc.clear()
    },
  })

  return {
    user: user ?? null,
    isLoading,
    isAdmin:      user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    login:  loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    loginError: loginMutation.error?.message,
    loginPending: loginMutation.isPending,
  }
}
