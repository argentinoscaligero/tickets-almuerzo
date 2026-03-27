import { PrismaClient, Rol } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PLANILLAS = [
  {
    nombre: 'IT SISTEMAS',
    empleados: [
      { nombre: 'Pablo Alberto',   apellido: 'Papalia',           sector: 'SISTEMAS' },
      { nombre: 'Javier Fernando', apellido: 'Jorge',             sector: 'SISTEMAS' },
      { nombre: 'Juan Pablo',      apellido: 'Ponce',             sector: 'SISTEMAS' },
      { nombre: 'Claudio Fabian',  apellido: 'Zwitkovits',        sector: 'SISTEMAS' },
      { nombre: 'German',          apellido: 'Villafanez',        sector: 'SISTEMAS' },
      { nombre: 'Matias',          apellido: 'Merkier',           sector: 'SISTEMAS' },
      { nombre: 'Hector Aquiles',  apellido: 'Suniaga Malave',    sector: 'SISTEMAS' },
      { nombre: 'Ruben Ignacio',   apellido: 'Aguilar',           sector: 'SEGURIDAD IT' },
      { nombre: 'Martin Alfredo',  apellido: 'Bruno',             sector: 'SOPORTE TECNICO' },
      { nombre: 'Lucas Ezequiel',  apellido: 'Palacios',          sector: 'SOPORTE TECNICO' },
      { nombre: 'Agustin',         apellido: 'Erbes',             sector: 'SOPORTE TECNICO' },
      { nombre: 'Hugo Norberto',   apellido: 'Bodano',            sector: 'SOPORTE TECNICO' },
      { nombre: 'Leandro Javier',  apellido: 'Ventura',           sector: 'SOPORTE TECNICO' },
    ],
  },
  {
    nombre: 'ADMINISTRACION',
    empleados: [
      { nombre: 'Mayra Carolina',       apellido: 'Carlino',            sector: 'CONTABLE' },
      { nombre: 'Maria de los Angeles', apellido: 'Vargas',             sector: 'CONTABLE' },
      { nombre: 'Stella Maris',         apellido: 'Vedovato',           sector: 'CONTABLE' },
      { nombre: 'Enrique Ariel',        apellido: 'Fusto',              sector: 'CONTABLE' },
      { nombre: 'Paola Ester',          apellido: 'Fernandez Penaloza', sector: 'CONTABLE' },
      { nombre: 'Nadia Milagros',       apellido: 'Vera',               sector: 'CONTABLE' },
      { nombre: 'Isabel Mirta',         apellido: 'Viveros',            sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Susana Alicia Maria',  apellido: 'Ladelfa',            sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Carlos Andres',        apellido: 'Amoroso',            sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Lautaro David',        apellido: 'Raposo',             sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Mauro Agustin',        apellido: 'Buffadossi',         sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Fabricio Exequiel',    apellido: 'Flores',             sector: 'FAC. Y COBRANZAS' },
      { nombre: 'Ruben',                apellido: 'Valtuille',          sector: 'AUDITORIA INTERNA' },
    ],
  },
  {
    nombre: 'COMPRAS Y MANTENIMIENTO',
    empleados: [
      { nombre: 'Mariano',        apellido: 'Valado',  sector: 'COMPRAS' },
      { nombre: 'Nahuel Hernan',  apellido: 'Casco',   sector: 'MANTENIMIENTO' },
      { nombre: 'Miguel Alberto', apellido: 'Ponce',   sector: 'MANTENIMIENTO' },
    ],
  },
  {
    nombre: 'NUTRAR',
    empleados: [
      { nombre: 'Camila Ayelen',    apellido: 'Arce',      sector: 'NUTRAR' },
      { nombre: 'Gisella Romina',   apellido: 'Cacciube',  sector: 'NUTRAR' },
      { nombre: 'Andrea Viviana',   apellido: 'Calabrese', sector: 'NUTRAR' },
      { nombre: 'Sandra Serena',    apellido: 'Capelli',   sector: 'NUTRAR' },
      { nombre: 'Micaela Jeanett',  apellido: 'Carballo',  sector: 'NUTRAR' },
      { nombre: 'Jimena Elizabeth', apellido: 'Ibanez',    sector: 'NUTRAR' },
      { nombre: 'Gisella Belen',    apellido: 'Ibarrola',  sector: 'NUTRAR' },
      { nombre: 'Evelin Mariel',    apellido: 'Jimenez',   sector: 'NUTRAR' },
      { nombre: 'Romina Paula',     apellido: 'Osores',    sector: 'NUTRAR' },
      { nombre: 'Marina',           apellido: 'Riveiro',   sector: 'NUTRAR' },
      { nombre: 'Sabrina Ayelen',   apellido: 'Sily',      sector: 'NUTRAR' },
      { nombre: 'Marianela Lilian', apellido: 'Soteras',   sector: 'NUTRAR' },
    ],
  },
  {
    nombre: 'RRHH',
    empleados: [
      { nombre: 'David',          apellido: 'Di Prinzio',     sector: 'RRHH' },
      { nombre: 'Luciana Alejandra', apellido: 'Jose',        sector: 'RRHH' },
      { nombre: 'Maria Belen',    apellido: 'Martinez',       sector: 'RRHH' },
      { nombre: 'Guadalupe',      apellido: 'Mendonca Nunes', sector: 'RRHH' },
      { nombre: 'Agustina',       apellido: 'Diaz Prieto',    sector: 'RRHH' },
      { nombre: 'FiorellaSol',    apellido: 'Nouailhac',      sector: 'RRHH' },
    ],
  },
  {
    nombre: 'FINANZAS',
    empleados: [
      { nombre: 'Adriana',                   apellido: 'Polinotto', sector: 'FINANZAS' },
      { nombre: 'Veronica Sofia',            apellido: 'Rodriguez', sector: 'FINANZAS' },
      { nombre: 'Agostina',                  apellido: 'Paredes',   sector: 'FINANZAS' },
      { nombre: 'Agostina',                  apellido: 'Schettino', sector: 'FINANZAS' },
      { nombre: 'Alejandro',                 apellido: 'Mazza',     sector: 'FINANZAS' },
      { nombre: 'Hernan Carlos',             apellido: 'Simari',    sector: 'FINANZAS' },
      { nombre: 'Santiago Facundo Emmanuel', apellido: 'Delgado',   sector: 'FINANZAS' },
      { nombre: 'Luciano',                   apellido: 'Benitez',   sector: 'FINANZAS' },
      { nombre: 'Lucas',                     apellido: 'Alegre',    sector: 'FINANZAS' },
      { nombre: 'Alejandro Daniel',          apellido: 'Bernal',    sector: 'ADMINISTRACION' },
    ],
  },
  {
    nombre: 'COMERCIAL',
    empleados: [
      { nombre: 'Arianda Deborah',  apellido: 'Bosovich',    sector: 'COMERCIAL' },
      { nombre: 'Sebastian',        apellido: 'Caprile',     sector: 'COMERCIAL' },
      { nombre: 'Sebastian',        apellido: 'Di Prinzio',  sector: 'COMERCIAL' },
      { nombre: 'Leonardo',         apellido: 'Grion',       sector: 'COMERCIAL' },
      { nombre: 'Nicolas',          apellido: 'Iaccarino',   sector: 'COMERCIAL' },
      { nombre: 'Dario Alejandro',  apellido: 'Laz',         sector: 'COMERCIAL' },
      { nombre: 'Agustina Abigail', apellido: 'Luna',        sector: 'COMERCIAL' },
      { nombre: 'Janice Camila',    apellido: 'Ojeda',       sector: 'COMERCIAL' },
      { nombre: 'Carlos Daniel',    apellido: 'Ontivero',    sector: 'COMERCIAL' },
      { nombre: 'Mauro Omar',       apellido: 'Sanchez',     sector: 'COMERCIAL' },
      { nombre: 'Gaston Dario',     apellido: 'Quintanilla', sector: 'NUTRAR' },
      { nombre: 'Agostina',         apellido: 'Tapia',       sector: 'NUTRAR' },
      { nombre: 'Lilia',            apellido: 'Ladelfa',     sector: 'DIRECCION' },
    ],
  },
  {
    nombre: 'FARMACIA FARMAMARKET',
    empleados: [
      { nombre: 'Maria Florencia',  apellido: 'Aguirre',      sector: 'FARMACIA' },
      { nombre: 'Barbara',          apellido: 'Colman',       sector: 'FARMACIA' },
      { nombre: 'Patricia Maria',   apellido: 'Fortunato',    sector: 'FARMACIA' },
      { nombre: 'Luis Domingo',     apellido: 'Francese',     sector: 'FARMACIA' },
      { nombre: 'Ezequiel',         apellido: 'Galeano',      sector: 'FARMACIA' },
      { nombre: 'Nicolas Facundo',  apellido: 'Galluccio',    sector: 'FARMACIA' },
      { nombre: 'Esther Pabla',     apellido: 'Gozategui',    sector: 'FARMACIA' },
      { nombre: 'Rocio Anahi',      apellido: 'Ibarra',       sector: 'FARMACIA' },
      { nombre: 'Juan Manuel',      apellido: 'Linhardt',     sector: 'FARMACIA' },
      { nombre: 'Analia Viviana',   apellido: 'Martinez',     sector: 'FARMACIA' },
      { nombre: 'Brian Daniel',     apellido: 'MartinezB',    sector: 'FARMACIA' },
      { nombre: 'Carlos',           apellido: 'Paterno',      sector: 'FARMACIA' },
      { nombre: 'Luciano Jose',     apellido: 'Ramirez',      sector: 'FARMACIA' },
      { nombre: 'Fernando Manuel',  apellido: 'Ramos',        sector: 'FARMACIA' },
      { nombre: 'Francisca',        apellido: 'Romano Rojas', sector: 'FARMACIA' },
      { nombre: 'Hilda Esther',     apellido: 'Sanchez',      sector: 'FARMACIA' },
      { nombre: 'Marcela Mabel',    apellido: 'Shinzato',     sector: 'FARMACIA' },
      { nombre: 'Maria Cecilia',    apellido: 'Bonzo',        sector: 'FARMACIA' },
      { nombre: 'Fernando',         apellido: 'Moyano',       sector: 'FARMACIA' },
    ],
  },
  {
    nombre: 'OPERACIONES',
    empleados: [
      { nombre: 'Camila Estefania',    apellido: 'Barroso',            sector: 'OPERACIONES' },
      { nombre: 'Blanca Rosa',         apellido: 'Benitez',            sector: 'OPERACIONES' },
      { nombre: 'Estela Felisa',       apellido: 'Calvello',           sector: 'OPERACIONES' },
      { nombre: 'Leandro',             apellido: 'Carregado',          sector: 'OPERACIONES' },
      { nombre: 'Maria Elisa',         apellido: 'Esquivel',           sector: 'OPERACIONES' },
      { nombre: 'Virginia Asuncion',   apellido: 'Gimenez Lopez',      sector: 'OPERACIONES' },
      { nombre: 'Luis Fabian',         apellido: 'Kunis',              sector: 'OPERACIONES' },
      { nombre: 'Natalia Rosaura',     apellido: 'Lozano',             sector: 'OPERACIONES' },
      { nombre: 'Victor Daniel',       apellido: 'Martinez Borda',     sector: 'OPERACIONES' },
      { nombre: 'Miguel Ricardo',      apellido: 'Matamoro',           sector: 'OPERACIONES' },
      { nombre: 'Diana Rosa',          apellido: 'Maydana',            sector: 'OPERACIONES' },
      { nombre: 'Mayra',               apellido: 'Mino',               sector: 'OPERACIONES' },
      { nombre: 'Natalia Soledad',     apellido: 'Nogales',            sector: 'OPERACIONES' },
      { nombre: 'German Alcides',      apellido: 'Raponi',             sector: 'OPERACIONES' },
      { nombre: 'Juan Martin',         apellido: 'Rodriguez Valverde', sector: 'OPERACIONES' },
      { nombre: 'Karina Elizabeth',    apellido: 'Rodriguez',          sector: 'OPERACIONES' },
      { nombre: 'Nicolas Ernesto',     apellido: 'Rossetti',           sector: 'OPERACIONES' },
      { nombre: 'Adrian Ezequiel',     apellido: 'Sbaffi',             sector: 'OPERACIONES' },
      { nombre: 'Celeste Nair',        apellido: 'Sevilon',            sector: 'OPERACIONES' },
      { nombre: 'Jenny Luz',           apellido: 'Yzaguirre Oliva',    sector: 'OPERACIONES' },
    ],
  },
  {
    nombre: 'DROGUERIA VORS',
    empleados: [
      { nombre: 'Mariano',          apellido: 'Castroagudin',  sector: 'COMERCIAL VORS' },
      { nombre: 'Javier Gaston',    apellido: 'Claure',        sector: 'COMERCIAL VORS' },
      { nombre: 'Julieta',          apellido: 'Ledesma',       sector: 'COMERCIAL VORS' },
      { nombre: 'Mirtha Yolanda',   apellido: 'Luna',          sector: 'COMERCIAL VORS' },
      { nombre: 'Victor Ariel',     apellido: 'Najmias',       sector: 'COMERCIAL VORS' },
      { nombre: 'Sofia Alejandra',  apellido: 'Pauluchak',     sector: 'COMERCIAL VORS' },
      { nombre: 'Juan Cruz',        apellido: 'Martinez',      sector: 'COMERCIAL VORS' },
      { nombre: 'Camila Daniela',   apellido: 'Piccone',       sector: 'COMERCIAL VORS' },
      { nombre: 'Paola Mariana',    apellido: 'Pompei',        sector: 'COMERCIAL VORS' },
      { nombre: 'Daniel Francisco', apellido: 'Princi',        sector: 'COMERCIAL VORS' },
      { nombre: 'Ornella Mailen',   apellido: 'Sacchi',        sector: 'COMERCIAL VORS' },
      { nombre: 'Marina Soledad',   apellido: 'Velez',         sector: 'COMERCIAL VORS' },
      { nombre: 'Maria Laura',      apellido: 'Vergara',       sector: 'COMERCIAL VORS' },
      { nombre: 'Roque Nicolas',    apellido: 'D Amore',       sector: 'EXPEDICION VORS' },
      { nombre: 'Rodrigo',          apellido: 'De Dios Cea',   sector: 'EXPEDICION VORS' },
      { nombre: 'Juan Francisco',   apellido: 'Di Roberto',    sector: 'EXPEDICION VORS' },
      { nombre: 'Diego Carlos',     apellido: 'Franchini',     sector: 'EXPEDICION VORS' },
      { nombre: 'Ezequiel',         apellido: 'Irala Saghin',  sector: 'EXPEDICION VORS' },
      { nombre: 'Patricio',         apellido: 'Monasterio',    sector: 'EXPEDICION VORS' },
      { nombre: 'Nicolas',          apellido: 'Quintanilla',   sector: 'EXPEDICION VORS' },
    ],
  },
  {
    nombre: 'DIRECCION GENERAL',
    empleados: [
      { nombre: 'Mirta',         apellido: 'Guzman',    sector: 'DIRECCION GENERAL' },
      { nombre: 'Juan Manuel',   apellido: 'Riveiro',   sector: 'DIRECCION GENERAL' },
      { nombre: 'Hector Dario',  apellido: 'Carballo',  sector: 'DIRECCION' },
      { nombre: 'Pablo Alberto', apellido: 'Gutierrez', sector: 'DIRECCION' },
      { nombre: 'Valeria',       apellido: 'Pastre',    sector: 'ASISTENCIA' },
    ],
  },
]

function emailFrom(nombre: string, apellido: string, suffix = ''): string {
  const clean = (s: string) =>
    s.split(' ')[0].toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
  return `${clean(nombre)}.${clean(apellido)}${suffix}@admifarmgroup.com`
}

async function main() {
  console.log('🌱 Iniciando seed de AG Servicios Farmacéuticos SA...\n')

  const hashDefault = await bcrypt.hash('Tickets2025!', 10)

  // Empresa
  const empresa = await prisma.empresa.upsert({
    where: { id: 'empresa-ag' },
    update: {},
    create: { id: 'empresa-ag', nombre: 'AG Servicios Farmacéuticos SA', cuit: '30-12345678-9' },
  })
  console.log(`✓ Empresa: ${empresa.nombre}`)

  // Config
  await prisma.configSistema.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, empresaId: empresa.id, topeDiario: 12000, horarioInicio: '12:00', horarioFin: '15:00' },
  })
  console.log('✓ Config: tope $12.000, horario 12:00-15:00')

  // Usuarios del sistema
  const sistemUsers = [
    { email: 'admin@admifarmgroup.com',       nombre: 'Admin',     apellido: 'Sistema',       rol: Rol.ADMIN },
    { email: 'controlador@admifarmgroup.com', nombre: 'Control',   apellido: 'Administracion', rol: Rol.CONTROLADOR },
    { email: 'tesoreria@admifarmgroup.com',   nombre: 'Tesoreria', apellido: 'AG',             rol: Rol.TESORERIA },
    { email: 'rrhh1@admifarmgroup.com',       nombre: 'RRHH',      apellido: 'Uno',            rol: Rol.RRHH },
    { email: 'rrhh2@admifarmgroup.com',       nombre: 'RRHH',      apellido: 'Dos',            rol: Rol.RRHH },
  ]
  for (const u of sistemUsers) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hashDefault },
    })
  }
  console.log(`✓ ${sistemUsers.length} usuarios del sistema`)

  // Sectores
  const todosLosSectores = [...new Set(PLANILLAS.flatMap(p => p.empleados.map(e => e.sector)))]
  const sectoresMap: Record<string, string> = {}
  for (const nombre of todosLosSectores) {
    const s = await prisma.sector.upsert({
      where: { nombre_empresaId: { nombre, empresaId: empresa.id } },
      update: {},
      create: { nombre, empresaId: empresa.id },
    })
    sectoresMap[nombre] = s.id
  }
  console.log(`✓ ${todosLosSectores.length} sectores`)

  // Planillas + Empleados + Validadores
  let totalEmpleados = 0
  const emailsUsados = new Set<string>()

  for (const pd of PLANILLAS) {
    const planilla = await prisma.planilla.upsert({
      where: { nombre_empresaId: { nombre: pd.nombre, empresaId: empresa.id } },
      update: {},
      create: { nombre: pd.nombre, empresaId: empresa.id },
    })

    // Validador de esta planilla
    const slug = pd.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')
    const emailVal = `validador.${slug}@admifarmgroup.com`
    const validador = await prisma.usuario.upsert({
      where: { email: emailVal },
      update: {},
      create: {
        email: emailVal,
        passwordHash: hashDefault,
        nombre: 'Validador',
        apellido: pd.nombre,
        rol: Rol.VALIDADOR,
        planillaId: planilla.id,
      },
    })
    await prisma.planillaValidador.upsert({
      where: { planillaId_validadorId: { planillaId: planilla.id, validadorId: validador.id } },
      update: {},
      create: { planillaId: planilla.id, validadorId: validador.id },
    })

    // Empleados
    for (const emp of pd.empleados) {
      let email = emailFrom(emp.nombre, emp.apellido)
      // Evitar duplicados de email
      if (emailsUsados.has(email)) {
        email = emailFrom(emp.nombre, emp.apellido, `${totalEmpleados}`)
      }
      emailsUsados.add(email)

      await prisma.usuario.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: hashDefault,
          nombre: emp.nombre,
          apellido: emp.apellido,
          rol: Rol.EMPLEADO,
          sectorId: sectoresMap[emp.sector],
          planillaId: planilla.id,
        },
      })
      totalEmpleados++
    }

    console.log(`  ✓ ${pd.nombre} (${pd.empleados.length} empleados)`)
  }

  console.log(`\n✅ Seed completado: ${totalEmpleados} empleados, ${PLANILLAS.length} planillas`)
  console.log('\n📋 Credenciales (password: Tickets2025!)')
  console.log('  admin@admifarmgroup.com          → ADMIN')
  console.log('  controlador@admifarmgroup.com    → CONTROLADOR')
  console.log('  rrhh1@admifarmgroup.com          → RRHH')
  console.log('  tesoreria@admifarmgroup.com      → TESORERIA')
  console.log('  validador.itsistemas@...         → VALIDADOR IT SISTEMAS')
  console.log('  martin.bruno@admifarmgroup.com   → EMPLEADO (Martin Bruno)')
  console.log('\n⚠️  Cambiar passwords desde panel RRHH antes de producción\n')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
