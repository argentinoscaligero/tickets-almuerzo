import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { analizarTicketConIA } from '@/lib/ai'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { usuario: true },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // Solo el dueño o admin pueden disparar el análisis
  if (ticket.usuarioId !== session.user.id && session.user.rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  if (!['SUBIDO', 'ANALIZANDO'].includes(ticket.estado)) {
    return NextResponse.json({ error: 'El ticket ya fue analizado' }, { status: 400 })
  }

  // Marcar como ANALIZANDO
  await prisma.ticket.update({
    where: { id: params.id },
    data: { estado: 'ANALIZANDO' },
  })

  try {
    // Leer configuración del sistema
    const config = await prisma.configSistema.findFirst({
      orderBy: { actualizadoEn: 'desc' },
    })
    const topeDiario = config?.topeDiario ? Number(config.topeDiario) : 12000
    const horarioInicio = config?.horarioInicio ?? '12:00'
    const horarioFin = config?.horarioFin ?? '15:00'

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

    // Guardar resultado en BD
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        estado: 'PENDIENTE_VALIDADOR',
        dictamenIA: dictamen.dictamen,
        confianzaIA: dictamen.confianza,
        comercioDetectado: dictamen.comercio,
        productosDetectados: dictamen.productos,
        montoDetectado: dictamen.montoDetectado,
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
        ticketId: params.id,
        usuarioId: session.user.id,
        tipo: 'IA_ANALIZO',
        comentario: `Dictamen IA: ${dictamen.dictamen} (confianza: ${dictamen.confianza}%). ${dictamen.observaciones}`,
      },
    })

    return NextResponse.json({ ticket: updatedTicket, dictamen })
  } catch (err) {
    console.error('Error en análisis IA:', err)
    // Volver a SUBIDO si falla para poder reintentar
    await prisma.ticket.update({
      where: { id: params.id },
      data: { estado: 'SUBIDO' },
    })
    return NextResponse.json({ error: 'Error al analizar con IA. Intentá de nuevo.' }, { status: 500 })
  }
}
