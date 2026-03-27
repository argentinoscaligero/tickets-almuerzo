import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET: listar liquidaciones o generar preview de la semana
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['TESORERIA', 'RRHH', 'ADMIN'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const semana = searchParams.get('semana')
  const preview = searchParams.get('preview') === 'true'

  if (preview && semana) {
    // Previsualizar: tickets EN_TESORERIA de esa semana agrupados por planilla
    const tickets = await prisma.ticket.findMany({
      where: { semana, estado: 'EN_TESORERIA' },
      include: {
        usuario: { include: { sector: true, planilla: true } },
      },
      orderBy: { usuario: { planilla: { nombre: 'asc' } } },
    })

    // Agrupar por planilla
    const porPlanilla: Record<string, { planilla: string; empleados: Record<string, any> }> = {}
    for (const t of tickets) {
      const p = t.usuario.planilla?.nombre ?? 'Sin planilla'
      if (!porPlanilla[p]) porPlanilla[p] = { planilla: p, empleados: {} }
      const u = t.usuarioId
      if (!porPlanilla[p].empleados[u]) {
        porPlanilla[p].empleados[u] = {
          empleadoId: u,
          nombre: t.usuario.nombre,
          sector: t.usuario.sector?.nombre ?? '',
          tickets: [],
          total: 0,
        }
      }
      porPlanilla[p].empleados[u].tickets.push(t)
      porPlanilla[p].empleados[u].total += Number(t.montoReintegro ?? t.montoDetectado ?? 0)
    }

    const resultado = Object.values(porPlanilla).map(p => ({
      planilla: p.planilla,
      empleados: Object.values(p.empleados),
      subtotal: Object.values(p.empleados).reduce((s: number, e: any) => s + e.total, 0),
    }))

    const totalGeneral = resultado.reduce((s, p) => s + p.subtotal, 0)
    return NextResponse.json({ preview: resultado, totalGeneral, totalTickets: tickets.length })
  }

  // Lista de liquidaciones existentes
  const liquidaciones = await prisma.liquidacion.findMany({
    orderBy: { creadoEn: 'desc' },
    take: 20,
  })
  return NextResponse.json({ liquidaciones })
}

// POST: crear liquidación (procesar pago de la semana)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !['TESORERIA', 'ADMIN'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { semana } = await req.json()
  if (!semana) return NextResponse.json({ error: 'Falta semana' }, { status: 400 })

  // Verificar que no exista ya
  const existe = await prisma.liquidacion.findFirst({ where: { semana } })
  if (existe) return NextResponse.json({ error: 'Ya existe una liquidación para esta semana' }, { status: 400 })

  // Tickets EN_TESORERIA de la semana
  const tickets = await prisma.ticket.findMany({
    where: { semana, estado: 'EN_TESORERIA' },
    include: { usuario: { include: { planilla: true } } },
  })

  if (tickets.length === 0) {
    return NextResponse.json({ error: 'No hay tickets en Tesorería para esta semana' }, { status: 400 })
  }

  const totalMonto = tickets.reduce((s, t) => s + Number(t.montoReintegro ?? t.montoDetectado ?? 0), 0)

  // Crear liquidación en transacción
  const liquidacion = await prisma.$transaction(async (tx) => {
    const liq = await tx.liquidacion.create({
      data: {
        semana,
        totalMonto,
        totalTickets: tickets.length,
        creadoPorId: session.user.id,
      },
    })

    // Crear items
    await tx.liquidacionItem.createMany({
      data: tickets.map(t => ({
        liquidacionId: liq.id,
        usuarioId: t.usuarioId,
        ticketId: t.id,
        monto: Number(t.montoReintegro ?? t.montoDetectado ?? 0),
      })),
    })

    // Marcar tickets como PAGADO
    await tx.ticket.updateMany({
      where: { id: { in: tickets.map(t => t.id) } },
      data: { estado: 'PAGADO' },
    })

    // Registrar acciones
    await tx.accionTicket.createMany({
      data: tickets.map(t => ({
        ticketId: t.id,
        usuarioId: session.user.id,
        tipo: 'PAGADO',
        comentario: `Liquidación ${semana} - ${liq.id}`,
      })),
    })

    return liq
  })

  return NextResponse.json({ liquidacion }, { status: 201 })
}
