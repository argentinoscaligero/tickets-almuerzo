import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const rol = session.user.rol

  // Redirigir al dashboard según el rol
  const destinos: Record<string, string> = {
    EMPLEADO:     '/dashboard/empleado',
    VALIDADOR:    '/dashboard/validador',
    CONTROLADOR:  '/dashboard/controlador',
    RRHH:         '/dashboard/rrhh',
    TESORERIA:    '/dashboard/tesoreria',
    ADMIN:        '/dashboard/admin',
  }

  redirect(destinos[rol] ?? '/dashboard/empleado')
}
