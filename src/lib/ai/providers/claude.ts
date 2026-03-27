import Anthropic from '@anthropic-ai/sdk'
import { AIProvider, AnalisisConfig, DictamenTicket } from '../types'
import { buildPrompt, calcularDictamen } from '../prompt'

export class ClaudeProvider implements AIProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async analizarTicket(imagenBase64: string, mimeType: string, config: AnalisisConfig): Promise<DictamenTicket> {
    const prompt = buildPrompt(config.topeDiario, config.horarioInicio, config.horarioFin)

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imagenBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : ''
    return this.parsearRespuesta(rawResponse, config)
  }

  private parsearRespuesta(raw: string, config: AnalisisConfig): DictamenTicket {
    let parsed: any = {}
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return this.respuestaError('No se pudo parsear la respuesta de la IA', raw)
    }

    const analisis = this.normalizarAnalisis(parsed, config)
    const { dictamen, confianza } = calcularDictamen(analisis, 70)

    return { ...analisis, dictamen, confianza, proveedorUsado: 'CLAUDE', rawResponse: raw }
  }

  private normalizarAnalisis(p: any, config: AnalisisConfig) {
    return {
      comercio: p.comercio || '',
      esGastronomico: Boolean(p.esGastronomico),
      productos: Array.isArray(p.productos) ? p.productos : [],
      productosValidos: Boolean(p.productosValidos),
      productosProblematicos: Array.isArray(p.productosProblematicos) ? p.productosProblematicos : [],
      fechaDetectada: p.fechaDetectada || '',
      horaDetectada: p.horaDetectada || '',
      fechaValida: this.validarFecha(p.fechaDetectada),
      horaValida: this.validarHora(p.horaDetectada, config),
      montoDetectado: Number(p.montoDetectado) || 0,
      montoValido: Number(p.montoDetectado) <= config.topeDiario && Number(p.montoDetectado) > 0,
      observaciones: p.observaciones || '',
      alertas: Array.isArray(p.alertas) ? p.alertas : [],
    }
  }

  private validarFecha(fecha: string): boolean {
    if (!fecha) return false
    const d = new Date(fecha)
    if (isNaN(d.getTime())) return false
    const dia = d.getDay()
    return dia !== 0 && dia !== 6 // 0=domingo, 6=sábado
  }

  private validarHora(hora: string, config: AnalisisConfig): boolean {
    if (!hora) return false
    const [h, m] = hora.split(':').map(Number)
    const [hIni, mIni] = config.horarioInicio.split(':').map(Number)
    const [hFin, mFin] = config.horarioFin.split(':').map(Number)
    const minutos = h * 60 + m
    return minutos >= hIni * 60 + mIni && minutos <= hFin * 60 + mFin
  }

  private respuestaError(msg: string, raw: string): DictamenTicket {
    return {
      dictamen: 'AMARILLO',
      confianza: 0,
      comercio: '',
      esGastronomico: false,
      productos: [],
      productosValidos: false,
      productosProblematicos: [],
      fechaDetectada: '',
      horaDetectada: '',
      fechaValida: false,
      horaValida: false,
      montoDetectado: 0,
      montoValido: false,
      observaciones: msg,
      alertas: [msg],
      proveedorUsado: 'CLAUDE',
      rawResponse: raw,
    }
  }
}
