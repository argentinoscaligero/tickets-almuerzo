'use client'

import { useState, useEffect, useRef } from 'react'
import { formatFecha, formatMonto, DICTAMEN_CONFIG, ESTADO_CONFIG } from '@/lib/utils'

type Ticket = {
  id: string
  imagenUrl: string
  estado: string
  dictamenIA?: string
  confianzaIA?: number
  comercioDetectado?: string
  montoDetectado?: number
  fechaDetectada?: string
  horaDetectada?: string
  observacionesIA?: string
  alertasIA?: string[]
  semana: string
  creadoEn: string
  acciones?: { tipo: string; comentario?: string; creadoEn: string; usuario: { nombre: string } }[]
}

type Stats = { total: number; aprobados: number; pendientes: number; rechazados: number }

export default function EmpleadoPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, aprobados: 0, pendientes: 0, rechazados: 0 })
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const hoy = new Date()
  const year = hoy.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((hoy.getTime() - startOfYear.getTime()) / 86400000) + 1
  const weekNum = Math.ceil(dayOfYear / 7)
  const semanaActual = `${year}-W${String(weekNum).padStart(2, '0')}`

  async function cargarDatos() {
    const [resTickets, resStats] = await Promise.all([
      fetch(`/api/tickets?semana=${semanaActual}&limit=50`),
      fetch(`/api/stats?semana=${semanaActual}`),
    ])
    if (resTickets.ok) {
      const data = await resTickets.json()
      setTickets(data.tickets)
    }
    if (resStats.ok) {
      const data = await resStats.json()
      setStats(data)
    }
  }

  useEffect(() => { cargarDatos() }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return setUploadError('Seleccioná una imagen primero')

    setUploading(true)
    setUploadError('')
    try {
      const form = new FormData()
      form.append('imagen', file)
      const res = await fetch('/api/tickets', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) return setUploadError(data.error || 'Error al subir')

      // Analizar automáticamente
      setAnalyzing(true)
      const resAn = await fetch(`/api/tickets/${data.ticket.id}/analizar`, { method: 'POST' })
      setAnalyzing(false)

      if (resAn.ok) {
        const anData = await resAn.json()
        setSelected(anData.ticket)
      }

      setPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      await cargarDatos()
    } catch {
      setUploadError('Error de red. Intentá de nuevo.')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const ticketHoySubido = tickets.find(t => {
    const d = new Date(t.creadoEn)
    return d.toDateString() === hoy.toDateString() &&
      !['RECHAZADO_VALIDADOR', 'RECHAZADO_CONTROLADOR', 'RECHAZADO_RRHH'].includes(t.estado)
  })

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Mis Tickets</h1>
      <p className="text-gray-500 text-sm mb-6">Semana actual · {semanaActual}</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Esta semana" value={stats.total} icon="🍽️" color="blue" />
        <StatCard label="Aprobados" value={stats.aprobados} icon="✅" color="green" />
        <StatCard label="Pendientes" value={stats.pendientes} icon="⏳" color="yellow" />
        <StatCard label="Rechazados" value={stats.rechazados} icon="❌" color="red" />
      </div>

      {/* Upload */}
      {!ticketHoySubido ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-4">📷 Subir ticket de hoy</h2>

          {preview ? (
            <div className="mb-4">
              <img src={preview} alt="Preview" className="max-h-64 rounded-lg border border-gray-200 mx-auto block" />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors mb-4">
              <span className="text-4xl mb-3">📷</span>
              <span className="text-sm font-medium text-gray-700">Tocá para seleccionar la foto del ticket</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG o WEBP · máx 10MB</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              ⚠️ {uploadError}
            </div>
          )}

          <div className="flex gap-3">
            {preview && (
              <button
                onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition-colors"
              >
                Cambiar foto
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={!preview || uploading || analyzing}
              className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {uploading ? '⏳ Subiendo...' : analyzing ? '🤖 Analizando con IA...' : '✅ Enviar para revisión'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">Ya subiste tu ticket de hoy</p>
            <p className="text-sm text-green-600">Estado: {ESTADO_CONFIG[ticketHoySubido.estado]?.label ?? ticketHoySubido.estado}</p>
          </div>
        </div>
      )}

      {/* Modal detalle */}
      {selected && (
        <TicketModal ticket={selected} onClose={() => setSelected(null)} />
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700 text-sm">Historial de tickets</h2>
        </div>
        {tickets.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <div className="text-4xl mb-3">🍽️</div>
            <p>No hay tickets esta semana</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tickets.map(t => (
              <li key={t.id}>
                <button
                  onClick={() => setSelected(t)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <img
                    src={t.imagenUrl}
                    alt="Ticket"
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-gray-800 truncate">
                        {t.comercioDetectado || 'Ticket'}
                      </span>
                      {t.dictamenIA && (
                        <span className="text-sm">{DICTAMEN_CONFIG[t.dictamenIA as keyof typeof DICTAMEN_CONFIG]?.emoji}</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex gap-3">
                      <span>{formatFecha(t.creadoEn)}</span>
                      {t.montoDetectado ? <span>{formatMonto(t.montoDetectado)}</span> : null}
                    </div>
                  </div>
                  <EstadoBadge estado={t.estado} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TicketModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const dictamenCfg = ticket.dictamenIA ? DICTAMEN_CONFIG[ticket.dictamenIA as keyof typeof DICTAMEN_CONFIG] : null
  const estadoCfg = ESTADO_CONFIG[ticket.estado]

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Detalle del ticket</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <img src={ticket.imagenUrl} alt="Ticket" className="w-full rounded-xl border border-gray-200" />

          {/* Estado */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Estado</span>
            <EstadoBadge estado={ticket.estado} />
          </div>

          {/* Dictamen IA */}
          {dictamenCfg && (
            <div className={`rounded-xl border p-4 ${dictamenCfg.bg} ${dictamenCfg.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{dictamenCfg.emoji}</span>
                <span className={`font-semibold text-sm ${dictamenCfg.color}`}>{dictamenCfg.label}</span>
                {ticket.confianzaIA !== undefined && (
                  <span className="text-xs text-gray-500 ml-auto">Confianza: {ticket.confianzaIA}%</span>
                )}
              </div>
              {ticket.observacionesIA && (
                <p className="text-sm text-gray-700 mt-1">{ticket.observacionesIA}</p>
              )}
              {ticket.alertasIA && ticket.alertasIA.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {ticket.alertasIA.map((a, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <span>⚠️</span><span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Datos extraídos */}
          {(ticket.comercioDetectado || ticket.montoDetectado || ticket.fechaDetectada) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos detectados</p>
              {ticket.comercioDetectado && (
                <Row label="Comercio" value={ticket.comercioDetectado} />
              )}
              {ticket.montoDetectado ? <Row label="Monto" value={formatMonto(ticket.montoDetectado)} /> : null}
              {ticket.fechaDetectada && <Row label="Fecha" value={formatFecha(ticket.fechaDetectada)} />}
              {ticket.horaDetectada && <Row label="Hora" value={ticket.horaDetectada} />}
            </div>
          )}

          {/* Historial de acciones */}
          {ticket.acciones && ticket.acciones.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historial</p>
              <div className="space-y-2">
                {ticket.acciones.map((a, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="text-xs text-gray-400 shrink-0 pt-0.5">{formatFecha(a.creadoEn)}</div>
                    <div>
                      <span className="font-medium text-gray-700">{a.usuario.nombre}</span>
                      <span className="text-gray-500"> · {a.tipo.replace(/_/g, ' ')}</span>
                      {a.comentario && <p className="text-gray-500 text-xs mt-0.5">{a.comentario}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, color: 'text-gray-600', bg: 'bg-gray-100' }
  return (
    <span className={`text-xs font-medium rounded-full px-2.5 py-1 shrink-0 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    red: 'bg-red-50 border-red-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
