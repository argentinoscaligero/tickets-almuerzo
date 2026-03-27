import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth'

const ROL_LABEL: Record<string, string> = {
  EMPLEADO: 'Empleado', VALIDADOR: 'Validador', CONTROLADOR: 'Controlador',
  RRHH: 'RRHH', TESORERIA: 'Tesorería', ADMIN: 'Administrador',
}

const NAV_ITEMS: Record<string, { label: string; href: string; icon: string }[]> = {
  EMPLEADO:    [{ label: 'Mis Tickets', href: '/dashboard/empleado', icon: '🍽️' }],
  VALIDADOR:   [{ label: 'Panel de revisión', href: '/dashboard/validador', icon: '📋' }],
  CONTROLADOR: [{ label: 'Control', href: '/dashboard/controlador', icon: '🔍' }],
  RRHH:        [
    { label: 'Aprobación final', href: '/dashboard/rrhh', icon: '✅' },
    { label: 'Configuración', href: '/dashboard/rrhh/config', icon: '⚙️' },
    { label: 'Empleados', href: '/dashboard/rrhh/empleados', icon: '👥' },
  ],
  TESORERIA:   [{ label: 'Liquidaciones', href: '/dashboard/tesoreria', icon: '💰' }],
  ADMIN:       [
    { label: 'Dashboard', href: '/dashboard/admin', icon: '🖥️' },
    { label: 'Usuarios', href: '/dashboard/admin/usuarios', icon: '👤' },
  ],
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const rol = session.user.rol
  const navItems = NAV_ITEMS[rol] ?? []

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-blue-950 text-white flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-blue-800">
          <div className="text-lg font-bold">🍽️ Tickets</div>
          <div className="text-xs text-blue-300 mt-0.5">AG Servicios Farmacéuticos</div>
        </div>

        <div className="px-3 py-4 border-b border-blue-800">
          <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">Sesión</div>
          <div className="text-sm font-medium truncate">{session.user.name}</div>
          <span className="inline-block text-xs bg-blue-700 text-blue-100 rounded-full px-2 py-0.5 mt-1">
            {ROL_LABEL[rol]}
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-blue-100 hover:bg-blue-800 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-blue-800">
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <button type="submit" className="w-full text-left text-sm text-blue-300 hover:text-white px-3 py-2 rounded-lg hover:bg-blue-800 transition-colors">
              🚪 Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-sm font-medium text-gray-500">
            Sistema de Validación de Tickets de Almuerzo
          </h1>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
