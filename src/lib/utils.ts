import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formato de semana ISO: "2025-W45"
export function semanaStr(fecha: Date): string {
  const year = getYear(fecha)
  const week = getWeek(fecha, { weekStartsOn: 1, firstWeekContainsDate: 4 })
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function semanaInicio(fecha: Date): Date {
  return startOfWeek(fecha, { weekStartsOn: 1 })
}

export function semanaFin(fecha: Date): Date {
  return endOfWeek(fecha, { weekStartsOn: 1 })
}

export function formatFecha(fecha: Date | string | null): string {
  if (!fecha) return '-'
  return format(new Date(fecha), 'dd/MM/yyyy', { locale: es })
}

export function formatMonto(monto: number | string | null): string {
  if (monto === null || monto === undefined) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(Number(monto))
}

export function esDiaHabil(fecha: Date): boolean {
  const dia = fecha.getDay() // 0=Dom, 6=Sab
  return dia >= 1 && dia <= 5
}

export function estaEnHorario(hora: string, inicio = '12:00', fin = '15:00'): boolean {
  return hora >= inicio && hora <= fin
}

// Semaforo de dictamen IA
export const DICTAMEN_CONFIG = {
  VERDE:    { label: 'Aprobado por IA',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300', emoji: '🟢' },
  AMARILLO: { label: 'Revisar',          color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-300', emoji: '🟡' },
  ROJO:     { label: 'Observado por IA', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300', emoji: '🔴' },
} as const

export const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUBIDO:                { label: 'Subido',              color: 'text-gray-600',   bg: 'bg-gray-100'   },
  ANALIZANDO:            { label: 'Analizando...',       color: 'text-blue-600',   bg: 'bg-blue-100'   },
  PENDIENTE_VALIDADOR:   { label: 'Pend. Validador',     color: 'text-orange-600', bg: 'bg-orange-100' },
  APROBADO_VALIDADOR:    { label: 'Aprobado Validador',  color: 'text-green-600',  bg: 'bg-green-100'  },
  RECHAZADO_VALIDADOR:   { label: 'Rechazado',           color: 'text-red-600',    bg: 'bg-red-100'    },
  PENDIENTE_CONTROLADOR: { label: 'Pend. Controlador',   color: 'text-orange-600', bg: 'bg-orange-100' },
  APROBADO_CONTROLADOR:  { label: 'Aprobado Control.',   color: 'text-green-600',  bg: 'bg-green-100'  },
  RECHAZADO_CONTROLADOR: { label: 'Rechazado',           color: 'text-red-600',    bg: 'bg-red-100'    },
  PENDIENTE_RRHH:        { label: 'Pend. RRHH',          color: 'text-orange-600', bg: 'bg-orange-100' },
  APROBADO_RRHH:         { label: 'Aprobado RRHH',       color: 'text-green-600',  bg: 'bg-green-100'  },
  RECHAZADO_RRHH:        { label: 'Rechazado',           color: 'text-red-600',    bg: 'bg-red-100'    },
  EN_TESORERIA:          { label: 'En Tesorería',        color: 'text-purple-600', bg: 'bg-purple-100' },
  PAGADO:                { label: 'Pagado ✓',            color: 'text-green-700',  bg: 'bg-green-200'  },
}

export const MOTIVO_LABEL: Record<string, string> = {
  R01_ILEGIBLE:               'Ticket ilegible o foto de mala calidad',
  R02_NO_GASTRONOMICO:        'No corresponde a negocio gastronómico',
  R03_PRODUCTOS_INVALIDOS:    'Productos que no son de almuerzo',
  R04_FECHA_INVALIDA:         'Fecha fuera de rango (fin de semana o feriado)',
  R05_HORARIO_INVALIDO:       'Horario fuera del rango 12:00-15:00 hs',
  R06_MONTO_SUPERA_TOPE:      'Monto supera el tope vigente',
  R07_DUPLICADO:              'Ticket duplicado',
  R08_PERTENECE_OTRO_EMPLEADO:'Ticket pertenece a otro empleado',
  R09_EXCEPCION_APROBADA:     'Excepción aprobada (situación extraordinaria)',
  R10_OTRO:                   'Otro motivo',
}
