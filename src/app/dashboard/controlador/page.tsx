import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RevisionTickets from '@/components/RevisionTickets'

export default async function ControladorPage() {
  const session = await auth()
  if (!session || !['CONTROLADOR', 'ADMIN'].includes(session.user.rol)) redirect('/dashboard')

  return (
    <RevisionTickets
      estadoPendiente="PENDIENTE_CONTROLADOR"
      titulo="Control Administrativo"
      subtitulo="Revisión de tickets aprobados por los validadores"
    />
  )
}
