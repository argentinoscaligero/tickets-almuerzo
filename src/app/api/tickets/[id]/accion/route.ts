import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

type AccionBody = {
  tipo: 'APROBAR' | 'RECHAZAR' | 'EXCEPCION'
  motivo?: string        // Código de motivo (R01, R02, etc.)
  comentario?: string    // Texto libre obligatorio en RECHAZAR/EXCEPCION
}

// Mapa de transiciones válidas por rol
const TRANSICIONES: Record<string, {
  estadosPermitidos: string[]
  aprobar: string
  rechazar: string
}> = {
  VALIDADOR:   { estadosPermitidos: ['PENDIENTE_VALIDADOR'],   aprobar: 'APROBADO_VALIDADOR',   rechazar: 'RECHAZADO_VALIDADOR'   },
  CONTROLADOR: { estadosPermitidos: ['PENDIENTE_CONTROLADOR'], aprobar: 'APROBADO_CONTROLADOR', rechazar: 'RECHAZADO_CONTROLADOR' },
  RRHH:        { estadosPermitidos: ['PENDIENTE_RRHH'],        aprobar: 'APROBADO_RRHH',        rechazar: 'RECHAZADO_RRHH'        },
  TESORERIA:   { estadosPermitidos: ['EN_TESORERIA'],          aprobar: 'PAGADO',               rechazar: 'EN_TESORERIA'          },
  ADMIN:       { estadosPermitidos: ['PENDIENTE_VALIDADOR', 'PENDIENTE_CONTROLADOR', 'PENDIENTE_RRHH', 'EN_TESORERIA'], aprobar: '', rechazar: '' },
}

// Flujo: APROBADO_VALIDADOR → PENDIENTE_CONTROLADOR → APROBADO_CONTROLADOR → PENDIENTE_RRHH → APROBADO_RRHH → EN_TESORERIA
const SIGUIENTE_ESTADO: Record<string, string> = {
  APROBADO_VALIDADOR:   'PENDIENTE_CONTROLADOR',
  APROBADO_CONTROLADOR: 'PENDIENTE_RRHH',
  APROBADO_RRHH:        'EN_TESORERIA',
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { tipo, motivo, comentario }: AccionBody = await req.json()
  const { id: userId, rol } = session.user

  const transicion = TRANSICIONES[rol]
  if (!transicion && rol !== 'ADMIN') {
    return NextResponse.json({ error: 'Rol sin permisos de acción' }, { status: 403 })
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { usuario: { include: { planilla: true } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // Verificar que el estado del ticket sea válido para este rol
  if (transicion && !transicion.estadosPermitidos.includes(ticket.estado)) {
    return NextResponse.json({
      error: `El ticket no está en un estado válido para esta acción (estado actual: ${ticket.estado})`,
    }, { status: 400 })
  }

  // Para VALIDADOR: verificar que el ticket sea de su planilla
  if (rol === 'VALIDADOR') {
    if (ticket.usuario.planillaId !== session.user.planillaId) {
      return NextResponse.json({ error: 'Este ticket no pertenece a tu planilla' }, { status: 403 })
    }
  }

  // Rechazar/Excepción requiere comentario
  if ((tipo === 'RECHAZAR' || tipo === 'EXCEPCION') && !comentario?.trim()) {
    return NextResponse.json({ error: 'El comentario es obligatorio para rechazar o aprobar una excepción' }, { status: 400 })
  }

  let nuevoEstado: string
  let tipoAccion: string

  if (tipo === 'APROBAR' || tipo === 'EXCEPCION') {
    // EXCEPCION = aprobar con justificación (ticket tiene dictamen ROJO/AMARILLO)
    nuevoEstado = transicion ? transicion.aprobar : ticket.estado
    // Avanzar al siguiente estado del flujo automáticamente
    if (SIGUIENTE_ESTADO[nuevoEstado]) {
      nuevoEstado = SIGUIENTE_ESTADO[nuevoEstado]
    }
    tipoAccion = tipo === 'EXCEPCION' ? 'EXCEPCION_APROBADA' : `APROBADO_${rol}`
  } else {
    nuevoEstado = transicion ? transicion.rechazar : ticket.estado
    tipoAccion = `RECHAZADO_${rol}`
  }

  // Para TESORERIA: APROBAR = PAGADO
  if (rol === 'TESORERIA' && tipo === 'APROBAR') {
    nuevoEstado = 'PAGADO'
    tipoAccion = 'PAGADO'
  }

  // Actualizar ticket y registrar acción en transacción
  const [updatedTicket, accion] = await prisma.$transaction([
    prisma.ticket.update({
      where: { id: params.id },
      data: {
        estado: nuevoEstado as any,
        motivoRechazo: motivo as any ?? null,
      },
    }),
    prisma.accionTicket.create({
      data: {
        ticketId: params.id,
        usuarioId: userId,
        tipo: tipoAccion,
        comentario: comentario ?? null,
        motivoRechazo: motivo as any ?? null,
      },
    }),
  ])

  return NextResponse.json({ ticket: updatedTicket, accion })
}
