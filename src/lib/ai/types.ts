export interface DictamenTicket {
  // Semáforo principal
  dictamen: 'VERDE' | 'AMARILLO' | 'ROJO'
  confianza: number // 0-100

  // Datos extraídos del ticket
  comercio: string
  esGastronomico: boolean
  productos: string[]
  productosValidos: boolean
  productosProblematicos: string[] // Items que generaron alarma

  fechaDetectada: string   // "2025-11-03"
  horaDetectada: string    // "13:45"
  fechaValida: boolean
  horaValida: boolean
  montoDetectado: number   // En pesos
  montoValido: boolean

  // Resumen para el Validador
  observaciones: string    // Texto legible con el análisis
  alertas: string[]        // Lista de problemas detectados

  // Para auditoría
  proveedorUsado: string
  rawResponse: string
}

export interface AIProvider {
  analizarTicket(
    imagenBase64: string,
    mimeType: string,
    config: AnalisisConfig
  ): Promise<DictamenTicket>
}

export interface AnalisisConfig {
  topeDiario: number
  horarioInicio: string  // "12:00"
  horarioFin: string     // "15:00"
}
