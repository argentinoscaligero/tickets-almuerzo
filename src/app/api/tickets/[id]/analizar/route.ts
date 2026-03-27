import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analizarTicketConIA } from '@/lib/ai'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id: ticketId } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { usuario: true },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  if (ticket.usuarioId !== session.user.id && session.user.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  if (!['SUBIDO', 'ANALIZANDO'].includes(ticket.estado)) {
    return NextResponse.json({ error: 'El ticket ya fue analizado' }, { status: 400 })
  }

  // Leer configuración del sistema
  const config = await prisma.configSistema.findFirst({
    orderBy: { actualizadoEn: 'desc' },
  })
  const topeDiario = config?.topeDiario ? Number(config.topeDiario) : 12000
  const horarioInicio = config?.horarioInicio ?? '12:00'
  const horarioFin = config?.horarioFin ?? '15:00'

  // Marcar como ANALIZANDO
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { estado: 'ANALIZANDO' },
  })

  try {
    // Leer imagen del disco
    const imagePath = join(process.cwd(), 'uploads', ticket.imagenUrl.replace('/uploads/', ''))
    const imageBuffer = await readFile(imagePath)
    const imagenBase64 = imageBuffer.toString('base64')

    // Analizar con IA
    const dictamen = await analizarTicketConIA(imagenBase64, ticket.mimeType, {
      topeDiario,
      horarioInicio,
      horarioFin,
    })

    // Monto a reintegrar = min(montoDetectado, topeDiario)
    const montoReintegro = dictamen.montoDetectado > 0
      ? Math.min(dictamen.montoDetectado, topeDiario)
      : null

    // Guardar resultado en BD
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        estado: 'PENDIENTE_VALIDADOR',
        dictamenIA: dictamen.dictamen,
        confianzaIA: dictamen.confianza,
        comercioDetectado: dictamen.comercio,
        productosDetectados: dictamen.productos,
        montoDetectado: dictamen.montoDetectado || null,
        montoReintegro,
        fechaDetectada: dictamen.fechaDetectada ? new Date(dictamen.fechaDetectada) : null,
        horaDetectada: dictamen.horaDetectada,
        observacionesIA: dictamen.observaciones,
        alertasIA: dictamen.alertas,
        proveedorIA: dictamen.proveedorUsado as any,
        rawResponseIA: dictamen.rawResponse,
      },
    })

    // Registrar acción
    await prisma.accionTicket.create({
      data: {
        ticketId,
        usuarioId: session.user.id,
        tipo: 'IA_ANALIZO',
        comentario: `Dictamen IA: ${dictamen.dictamen} (confianza: ${dictamen.confianza}%). ${dictamen.observaciones}`,
      },
    })

    return NextResponse.json({ ticket: updatedTicket, dictamen, montoReintegro })

  } catch (err) {
    console.error('Error en análisis IA:', err)
    // Si la IA falla → igual avanzar a PENDIENTE_VALIDADOR para revisión manual
    // No bloquear al empleado por falta de API key
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        estado: 'PENDIENTE_VALIDADOR',
        observacionesIA: 'Análisis automático no disponible. Requiere revisión manual del validador.',
        alertasIA: ['IA no disponible — revisar manualmente'],
      },
    })
    await prisma.accionTicket.create({
      data: {
        ticketId,
        usuarioId: session.user.id,
        tipo: 'IA_ERROR',
        comentario: 'Análisis IA no disponible (sin API key o error de red). Enviado a revisión manual.',
      },
    })
    // Devolver como éxito parcial — el ticket sigue su flujo
    return NextResponse.json({
      ticket: updatedTicket,
      warning: 'IA no disponible — el ticket fue enviado a revisión manual',
    })
  }
}
