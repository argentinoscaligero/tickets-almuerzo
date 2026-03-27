import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider, AnalisisConfig, DictamenTicket } from '../types'
import { buildPrompt, calcularDictamen } from '../prompt'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
  }

  async analizarTicket(imagenBase64: string, mimeType: string, config: AnalisisConfig): Promise<DictamenTicket> {
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const prompt = buildPrompt(config.topeDiario, config.horarioInicio, config.horarioFin)

    const result = await model.generateContent([
      { inlineData: { data: imagenBase64, mimeType } },
      prompt,
    ])

    const raw = result.response.text()
    return this.parsearRespuesta(raw, config)
  }

  private parsearRespuesta(raw: string, config: AnalisisConfig): DictamenTicket {
    let parsed: any = {}
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return this.respuestaError('No se pudo parsear la respuesta', raw)
    }
    const analisis = {
      comercio: parsed.comercio || '',
      esGastronomico: Boolean(parsed.esGastronomico),
      productos: Array.isArray(parsed.productos) ? parsed.productos : [],
      productosValidos: Boolean(parsed.productosValidos),
      productosProblematicos: Array.isArray(parsed.productosProblematicos) ? parsed.productosProblematicos : [],
      fechaDetectada: parsed.fechaDetectada || '',
      horaDetectada: parsed.horaDetectada || '',
      fechaValida: this.validarFecha(parsed.fechaDetectada),
      horaValida: this.validarHora(parsed.horaDetectada, config),
      montoDetectado: Number(parsed.montoDetectado) || 0,
      montoValido: Number(parsed.montoDetectado) <= config.topeDiario && Number(parsed.montoDetectado) > 0,
      observaciones: parsed.observaciones || '',
      alertas: Array.isArray(parsed.alertas) ? parsed.alertas : [],
    }
    const { dictamen, confianza } = calcularDictamen(analisis, 70)
    return { ...analisis, dictamen, confianza, proveedorUsado: 'GEMINI', rawResponse: raw }
  }

  private validarFecha(fecha: string): boolean {
    if (!fecha) return false
    const d = new Date(fecha)
    if (isNaN(d.getTime())) return false
    return d.getDay() !== 0 && d.getDay() !== 6
  }

  private validarHora(hora: string, config: AnalisisConfig): boolean {
    if (!hora) return false
    const [h, m] = hora.split(':').map(Number)
    const [hIni, mIni] = config.horarioInicio.split(':').map(Number)
    const [hFin, mFin] = config.horarioFin.split(':').map(Number)
    return (h * 60 + m) >= (hIni * 60 + mIni) && (h * 60 + m) <= (hFin * 60 + mFin)
  }

  private respuestaError(msg: string, raw: string): DictamenTicket {
    return {
      dictamen: 'AMARILLO', confianza: 0, comercio: '', esGastronomico: false,
      productos: [], productosValidos: false, productosProblematicos: [],
      fechaDetectada: '', horaDetectada: '', fechaValida: false, horaValida: false,
      montoDetectado: 0, montoValido: false, observaciones: msg, alertas: [msg],
      proveedorUsado: 'GEMINI', rawResponse: raw,
    }
  }
}
