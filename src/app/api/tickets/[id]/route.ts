import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
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
  const { id, rol } = session.user
  if (rol === 'EMPLEADO' && ticket.usuarioId !== id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  return NextResponse.json({ ticket })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({ where: { id: params.id } })
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // Solo el empleado dueño puede borrar, y solo si está en estado SUBIDO o ANALIZANDO
  if (ticket.usuarioId !== session.user.id && session.user.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }
  if (!['SUBIDO', 'ANALIZANDO'].includes(ticket.estado)) {
    return NextResponse.json({ error: 'No se puede eliminar un ticket que ya está en proceso de revisión' }, { status: 400 })
  }

  await prisma.ticket.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
