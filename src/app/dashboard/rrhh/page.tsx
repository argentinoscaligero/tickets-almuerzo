import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import RevisionTickets from '@/components/RevisionTickets'

export default async function RrhhPage() {
  const session = await auth()
  if (!session || !['RRHH', 'ADMIN'].includes(session.user.rol)) redirect('/dashboard')

  return (
    <RevisionTickets
      estadoPendiente="PENDIENTE_RRHH"
      titulo="Aprobación Final RRHH"
      subtitulo="Última instancia antes de enviar a Tesorería"
    />
  )
}
