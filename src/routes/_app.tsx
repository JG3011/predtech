import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getSession } from '../server/auth.functions.js'
import { AppShell } from '../components/AppShell.js'
import { ToastProvider } from '../components/Toast.js'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const { role } = await getSession()
    if (!role) {
      throw redirect({ to: '/login' })
    }
    return { role }
  },
  component: AppLayout,
})

function AppLayout() {
  const { role } = Route.useRouteContext()
  return (
    <ToastProvider>
      <AppShell role={role}>
        <Outlet />
      </AppShell>
    </ToastProvider>
  )
}
