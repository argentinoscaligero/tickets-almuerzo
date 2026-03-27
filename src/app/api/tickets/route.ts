import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// GET /api/tickets — lista según rol
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const semana = searchParams.get('semana') // "2025-W45"
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const skip = (page - 1) * limit

  const { id, rol, planillaId } = session.user

  let where: any = {}

  if (rol === 'EMPLEADO') {
    where.usuarioId = id
  } else if (rol === 'VALIDADOR') {
    // Ve tickets de empleados de su planilla
    where.usuario = { planillaId: planillaId ?? undefined }
    where.estado = { in: ['PENDIENTE_VALIDADOR', 'APROBADO_VALIDADOR', 'RECHAZADO_VALIDADOR',
      'PENDIENTE_CONTROLADOR', 'APROBADO_CONTROLADOR', 'RECHAZADO_CONTROLADOR',
      'PENDIENTE_RRHH', 'APROBADO_RRHH', 'RECHAZADO_RRHH', 'EN_TESORERIA', 'PAGADO'] }
  } else if (rol === 'CONTROLADOR') {
    where.estado = { in: ['PENDIENTE_CONTROLADOR', 'APROBADO_CONTROLADOR', 'RECHAZADO_CONTROLADOR',
      'PENDIENTE_RRHH', 'APROBADO_RRHH', 'RECHAZADO_RRHH', 'EN_TESORERIA', 'PAGADO'] }
  } else if (rol === 'RRHH') {
    where.estado = { in: ['PENDIENTE_RRHH', 'APROBADO_RRHH', 'RECHAZADO_RRHH', 'EN_TESORERIA', 'PAGADO'] }
  } else if (rol === 'TESORERIA') {
    where.estado = { in: ['EN_TESORERIA', 'PAGADO'] }
  }
  // ADMIN ve todo

  if (semana) {
    where.semana = semana
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        usuario: { include: { sector: true, planilla: true } },
        acciones: { orderBy: { creadoEn: 'desc' }, take: 1, include: { usuario: true } },
      },
      orderBy: { creadoEn: 'desc' },
      skip,
      take: limit,
    }),
    prisma.ticket.count({ where }),
  ])

  return NextResponse.json({ tickets, total, page, limit })
}

// POST /api/tickets — subir nuevo ticket
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!['EMPLEADO', 'ADMIN'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('imagen') as File | null
    const fechaStr = formData.get('fecha') as string | null

    if (!file) return NextResponse.json({ error: 'Falta imagen' }, { status: 400 })

    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!tiposPermitidos.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido. Usá JPG, PNG o WEBP.' }, { status: 400 })
    }

    // Validar tamaño (máx 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen supera los 10MB.' }, { status: 400 })
    }

    // Guardar archivo
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))

    // Calcular semana ISO
    const fecha = fechaStr ? new Date(fechaStr) : new Date()
    const year = fecha.getFullYear()
    // getWeek ISO
    const startOfYear = new Date(year, 0, 1)
    const dayOfYear = Math.floor((fecha.getTime() - startOfYear.getTime()) / 86400000) + 1
    const weekNum = Math.ceil(dayOfYear / 7)
    const semana = `${year}-W${String(weekNum).padStart(2, '0')}`

    // Verificar duplicados del día
    const startOfDay = new Date(fecha)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(fecha)
    endOfDay.setHours(23, 59, 59, 999)

    const ticketHoy = await prisma.ticket.findFirst({
      where: {
        usuarioId: session.user.id,
        creadoEn: { gte: startOfDay, lte: endOfDay },
        estado: { notIn: ['RECHAZADO_VALIDADOR', 'RECHAZADO_CONTROLADOR', 'RECHAZADO_RRHH'] },
      },
    })
    if (ticketHoy) {
      return NextResponse.json({ error: 'Ya tenés un ticket subido para hoy.' }, { status: 400 })
    }

    // Crear ticket en BD
    const ticket = await prisma.ticket.create({
      data: {
        usuarioId: session.user.id,
        imagenUrl: `/uploads/${filename}`,
        mimeType: file.type,
        semana,
        estado: 'SUBIDO',
      },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (err) {
    console.error('Error subiendo ticket:', err)
    return NextResponse.json({ error: 'Error interno al subir ticket' }, { status: 500 })
  }
}
