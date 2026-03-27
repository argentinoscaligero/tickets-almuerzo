import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id: ticketId } = await params
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      usuario: { include: { sector: true, planilla: true } },
      acciones: {
        orderBy: { creadoEn: 'asc' },
        include: { usuario: { select: { id: true, nombre: true, rol: true } } },
      },
    },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // Verificar acceso
  const { id: userId, rol } = session.user
  if (rol === 'EMPLEADO' && ticket.usuarioId !== userId) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  return NextResponse.json({ ticket })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id: ticketId } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } })
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (ticket.usuarioId !== session.user.id && session.user.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (!['SUBIDO', 'ANALIZANDO'].includes(ticket.estado)) {
    return NextResponse.json({ error: 'No se puede eliminar un ticket que ya está en proceso de revisión' }, { status: 400 })
  }

  await prisma.ticket.delete({ where: { id: ticketId } })
  return NextResponse.json({ ok: true })
}
