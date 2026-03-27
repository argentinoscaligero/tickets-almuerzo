export function buildPrompt(topeDiario: number, horarioInicio: string, horarioFin: string): string {
  return `Eres un asistente de validación de tickets de almuerzo para una empresa argentina.
Tu rol es ASESORAR al humano que toma la decisión final. NUNCA rechazas un ticket de forma definitiva.

Analizá la imagen del ticket/comprobante y respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:

{
  "comercio": "nombre del comercio detectado",
  "esGastronomico": true/false,
  "productos": ["producto1", "producto2"],
  "productosValidos": true/false,
  "productosProblematicos": ["producto que genera alarma"],
  "fechaDetectada": "YYYY-MM-DD o vacío si no se ve",
  "horaDetectada": "HH:MM o vacío si no se ve",
  "montoDetectado": 0,
  "observaciones": "resumen legible del análisis",
  "alertas": ["alerta1", "alerta2"]
}

REGLAS DE ANÁLISIS:

1. COMERCIO GASTRONÓMICO: restaurante, rotisería, panadería, confitería, pizzería, supermercado, dietética,
   food truck, sushi, hamburguesería, rotisería, bar con comida, cafetería.
   NO gastronómico: farmacia, ropa, electrónica, librería, ferretería.

2. PRODUCTOS DE ALMUERZO: comidas, platos, sandwiches, ensaladas, bebidas sin alcohol (agua, jugo, gaseosa),
   postres. PROBLEMÁTICOS: alcohol, cigarrillos, ropa, artículos de limpieza, indumentaria, medicamentos.

3. FECHA: debe ser lunes a viernes (día hábil). Si ves fin de semana, marcá como alerta.

4. HORA: debe estar entre ${horarioInicio} y ${horarioFin}. Si está fuera de ese rango, marcá como alerta.

5. MONTO: el tope es $${topeDiario.toLocaleString('es-AR')} por persona por día. Si supera ese monto, marcá como alerta.

6. Si la imagen es ilegible o de baja calidad, marcá en las alertas.

IMPORTANTE: Respondé SOLO con el JSON, sin texto adicional, sin markdown, sin bloques de código.`
}

export function calcularDictamen(
  analisis: Omit<import('./types').DictamenTicket, 'dictamen' | 'confianza' | 'proveedorUsado' | 'rawResponse'>,
  umbral: number
): { dictamen: 'VERDE' | 'AMARILLO' | 'ROJO'; confianza: number } {
  const alertas = analisis.alertas.length
  let puntos = 100

  if (!analisis.esGastronomico) puntos -= 40
  if (!analisis.productosValidos) puntos -= 30
  if (!analisis.fechaValida) puntos -= 20
  if (!analisis.horaValida) puntos -= 20
  if (!analisis.montoValido) puntos -= 15
  if (!analisis.comercio) puntos -= 10
  puntos -= alertas * 5

  const confianza = Math.max(0, Math.min(100, puntos))

  let dictamen: 'VERDE' | 'AMARILLO' | 'ROJO'
  if (!analisis.esGastronomico || !analisis.productosValidos || !analisis.fechaValida || !analisis.horaValida) {
    dictamen = 'ROJO'
  } else if (confianza < umbral || alertas > 0) {
    dictamen = 'AMARILLO'
  } else {
    dictamen = 'VERDE'
  }

  return { dictamen, confianza }
}
