import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || !['RRHH', 'ADMIN'].includes(session.user.rol)) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const buscar = searchParams.get('q') ?? ''
  const sectorId = searchParams.get('sectorId')
  const planillaId = searchParams.get('planillaId')

  const empleados = await prisma.usuario.findMany({
    where: {
      rol: 'EMPLEADO',
      activo: true,
      ...(buscar && {
        OR: [
          { nombre: { contains: buscar, mode: 'insensitive' } },
          { email: { contains: buscar, mode: 'insensitive' } },
        ],
      }),
      ...(sectorId && { sectorId }),
      ...(planillaId && { planillaId }),
    },
    include: {
      sector: true,
      planilla: true,
    },
    orderBy: [{ planilla: { nombre: 'asc' } }, { nombre: 'asc' }],
    take: 200,
  })

  return NextResponse.json({ empleados })
}
