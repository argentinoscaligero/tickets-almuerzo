import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const config = await prisma.configSistema.findFirst({ orderBy: { actualizadoEn: 'desc' } })
  return NextResponse.json({ config })
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.rol !== 'RRHH') {
    return NextResponse.json({ error: 'Solo RRHH puede modificar la configuración' }, { status: 403 })
  }

  const body = await req.json()
  const { topeDiario, horarioInicio, horarioFin, proveedorIA, apiKeyIA } = body

  const config = await prisma.configSistema.upsert({
    where: { id: 1 },
    update: {
      ...(topeDiario !== undefined && { topeDiario }),
      ...(horarioInicio && { horarioInicio }),
      ...(horarioFin && { horarioFin }),
      ...(proveedorIA && { proveedorIA }),
      ...(apiKeyIA && { apiKeyIA }),
    },
    create: {
      id: 1,
      topeDiario: topeDiario ?? 12000,
      horarioInicio: horarioInicio ?? '12:00',
      horarioFin: horarioFin ?? '15:00',
    },
  })

  return NextResponse.json({ config })
}
