import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const semana = searchParams.get('semana')
  const { id, rol, planillaId } = session.user

  if (rol === 'EMPLEADO') {
    // Stats del empleado para la semana actual
    const where: any = { usuarioId: id }
    if (semana) where.semana = semana

    const [total, aprobados, pendientes, rechazados] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, estado: { in: ['APROBADO_RRHH', 'EN_TESORERIA', 'PAGADO'] } } }),
      prisma.ticket.count({ where: { ...where, estado: { in: ['SUBIDO', 'ANALIZANDO', 'PENDIENTE_VALIDADOR', 'PENDIENTE_CONTROLADOR', 'PENDIENTE_RRHH'] } } }),
      prisma.ticket.count({ where: { ...where, estado: { in: ['RECHAZADO_VALIDADOR', 'RECHAZADO_CONTROLADOR', 'RECHAZADO_RRHH'] } } }),
    ])
    return NextResponse.json({ total, aprobados, pendientes, rechazados })
  }

  if (rol === 'VALIDADOR') {
    const where: any = { usuario: { planillaId: planillaId ?? undefined } }
    if (semana) where.semana = semana
    const [pendientes, aprobados, rechazados] = await Promise.all([
      prisma.ticket.count({ where: { ...where, estado: 'PENDIENTE_VALIDADOR' } }),
      prisma.ticket.count({ where: { ...where, estado: { in: ['APROBADO_VALIDADOR', 'PENDIENTE_CONTROLADOR'] } } }),
      prisma.ticket.count({ where: { ...where, estado: 'RECHAZADO_VALIDADOR' } }),
    ])
    return NextResponse.json({ pendientes, aprobados, rechazados })
  }

  if (rol === 'CONTROLADOR') {
    const [pendientes, aprobados, rechazados] = await Promise.all([
      prisma.ticket.count({ where: { estado: 'PENDIENTE_CONTROLADOR' } }),
      prisma.ticket.count({ where: { estado: 'APROBADO_CONTROLADOR' } }),
      prisma.ticket.count({ where: { estado: 'RECHAZADO_CONTROLADOR' } }),
    ])
    return NextResponse.json({ pendientes, aprobados, rechazados })
  }

  if (rol === 'RRHH') {
    const [pendientes, aprobados, rechazados, enTesoreria] = await Promise.all([
      prisma.ticket.count({ where: { estado: 'PENDIENTE_RRHH' } }),
      prisma.ticket.count({ where: { estado: 'APROBADO_RRHH' } }),
      prisma.ticket.count({ where: { estado: 'RECHAZADO_RRHH' } }),
      prisma.ticket.count({ where: { estado: 'EN_TESORERIA' } }),
    ])
    return NextResponse.json({ pendientes, aprobados, rechazados, enTesoreria })
  }

  if (rol === 'TESORERIA') {
    const [enTesoreria, pagados] = await Promise.all([
      prisma.ticket.count({ where: { estado: 'EN_TESORERIA' } }),
      prisma.ticket.count({ where: { estado: 'PAGADO' } }),
    ])
    return NextResponse.json({ enTesoreria, pagados })
  }

  return NextResponse.json({})
}
