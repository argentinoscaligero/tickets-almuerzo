import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import RevisionTickets from '@/components/RevisionTickets'

export default async function ValidadorPage() {
  const session = await auth()
  if (!session || !['VALIDADOR', 'ADMIN'].includes(session.user.rol)) redirect('/dashboard')

  let planillaNombre = ''
  if (session.user.planillaId) {
    const planilla = await prisma.planilla.findUnique({ where: { id: session.user.planillaId } })
    planillaNombre = planilla?.nombre ?? ''
  }

  return (
    <RevisionTickets
      estadoPendiente="PENDIENTE_VALIDADOR"
      titulo="Panel de Validación"
      subtitulo={planillaNombre ? `Planilla: ${planillaNombre}` : 'Todos los sectores'}
    />
  )
}
