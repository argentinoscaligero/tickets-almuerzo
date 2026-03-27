'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatFecha, formatMonto, DICTAMEN_CONFIG, ESTADO_CONFIG, MOTIVO_LABEL } from '@/lib/utils'

type Ticket = {
  id: string
  imagenUrl: string
  estado: string
  dictamenIA?: string
  confianzaIA?: number
  comercioDetectado?: string
  montoDetectado?: number
  montoReintegro?: number
  fechaDetectada?: string
  horaDetectada?: string
  observacionesIA?: string
  alertasIA?: string[]
  semana: string
  creadoEn: string
  usuario: {
    nombre: string
    email: string
    sector?: { nombre: string }
    planilla?: { nombre: string }
  }
  acciones?: {
    tipo: string
    comentario?: string
    motivoRechazo?: string
    creadoEn: string
    usuario: { nombre: string; rol: string }
  }[]
}

type Props = {
  estadoPendiente: string
  titulo: string
  subtitulo?: string
}

const MOTIVOS = Object.entries(MOTIVO_LABEL)

export default function RevisionTickets({ estadoPendiente, titulo, subtitulo }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [accionando, setAccionando] = useState(false)
  const [modalAccion, setModalAccion] = useState<'APROBAR' | 'RECHAZAR' | 'EXCEPCION' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [filtroDict, setFiltroDict] = useState<string>('TODOS')
  const [semana, setSemana] = useState('')

  // Semana actual
  useEffect(() => {
    const hoy = new Date()
    const year = hoy.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const dayOfYear = Math.floor((hoy.getTime() - startOfYear.getTime()) / 86400000) + 1
    const weekNum = Math.ceil(dayOfYear / 7)
    setSemana(`${year}-W${String(weekNum).padStart(2, '0')}`)
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets?limit=100`)
    if (res.ok) {
      const data = await res.json()
      // Solo los pendientes para este nivel
      const pendientes = data.tickets.filter((t: Ticket) => t.estado === estadoPendiente)
      setTickets(pendientes)
    }
    setLoading(false)
  }, [estadoPendiente])

  useEffect(() => { cargar() }, [cargar])

  async function ejecutarAccion() {
    if (!selected || !modalAccion) return
    if ((modalAccion === 'RECHAZAR' || modalAccion === 'EXCEPCION') && !comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }
    setAccionando(true)
    setError('')
    try {
      const res = await fetch(`/api/tickets/${selected.id}/accion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: modalAccion, motivo: motivo || undefined, comentario: comentario || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModalAccion(null)
      setSelected(null)
      setMotivo('')
      setComentario('')
      await cargar()
    } catch {
      setError('Error de red')
    } finally {
      setAccionando(false)
    }
  }

  const ticketsFiltrados = filtroDict === 'TODOS'
    ? tickets
    : tickets.filter(t => t.dictamenIA === filtroDict)

  const countByDict = {
    VERDE:    tickets.filter(t => t.dictamenIA === 'VERDE').length,
    AMARILLO: tickets.filter(t => t.dictamenIA === 'AMARILLO').length,
    ROJO:     tickets.filter(t => t.dictamenIA === 'ROJO').length,
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{titulo}</h1>
      {subtitulo && <p className="text-gray-500 text-sm mb-6">{subtitulo}</p>}

      {/* Filtros por dictamen */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'TODOS', label: `Todos (${tickets.length})`, bg: 'bg-gray-100 text-gray-700', active: 'bg-gray-800 text-white' },
          { key: 'VERDE',    label: `🟢 Aprobados IA (${countByDict.VERDE})`,    bg: 'bg-green-50 text-green-700 border border-green-200',   active: 'bg-green-600 text-white' },
          { key: 'AMARILLO', label: `🟡 Revisar (${countByDict.AMARILLO})`,       bg: 'bg-yellow-50 text-yellow-700 border border-yellow-200', active: 'bg-yellow-500 text-white' },
          { key: 'ROJO',     label: `🔴 Observados IA (${countByDict.ROJO})`,     bg: 'bg-red-50 text-red-700 border border-red-200',         active: 'bg-red-600 text-white' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroDict(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroDict === f.key ? f.active : f.bg}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          <p>Cargando tickets...</p>
        </div>
      ) : ticketsFiltrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-medium">No hay tickets pendientes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Imagen</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Comercio</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket / Reintegro</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dictamen IA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ticketsFiltrados.map(t => {
                const dictCfg = t.dictamenIA ? DICTAMEN_CONFIG[t.dictamenIA as keyof typeof DICTAMEN_CONFIG] : null
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(t)}>
                        <img
                          src={t.imagenUrl}
                          alt="Ticket"
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 hover:scale-110 transition-transform"
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{t.usuario.nombre}</div>
                      <div className="text-xs text-gray-400">{t.usuario.sector?.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.comercioDetectado || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.montoDetectado ? (
                        <div>
                          <div className="font-medium text-gray-800">{formatMonto(t.montoReintegro ?? t.montoDetectado)}</div>
                          {t.montoReintegro !== undefined && t.montoDetectado !== undefined && t.montoReintegro < t.montoDetectado && (
                            <div className="text-xs text-amber-600">ticket: {formatMonto(t.montoDetectado)}</div>
                          )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {dictCfg ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${dictCfg.bg} ${dictCfg.color} ${dictCfg.border}`}>
                          {dictCfg.emoji} {dictCfg.label}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {t.fechaDetectada ? formatFecha(t.fechaDetectada) : formatFecha(t.creadoEn)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => { setSelected(t); setModalAccion('APROBAR') }}
                          className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                        >
                          ✓ Aprobar
                        </button>
                        {t.dictamenIA === 'ROJO' || t.dictamenIA === 'AMARILLO' ? (
                          <button
                            onClick={() => { setSelected(t); setModalAccion('EXCEPCION') }}
                            className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors"
                          >
                            ⚡ Excepción
                          </button>
                        ) : null}
                        <button
                          onClick={() => { setSelected(t); setModalAccion('RECHAZAR') }}
                          className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle imagen */}
      {selected && !modalAccion && (
        <TicketDetailModal ticket={selected} onClose={() => setSelected(null)} />
      )}

      {/* Modal acción */}
      {selected && modalAccion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {modalAccion === 'APROBAR' ? '✓ Aprobar ticket' :
                 modalAccion === 'EXCEPCION' ? '⚡ Aprobar excepción' :
                 '✕ Rechazar ticket'}
              </h3>
              <button onClick={() => { setModalAccion(null); setError('') }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info ticket */}
              <div className="flex gap-3 items-start bg-gray-50 rounded-xl p-3">
                <img src={selected.imagenUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{selected.usuario.nombre}</p>
                  <p className="text-gray-500">
                    {selected.comercioDetectado || '—'} ·{' '}
                    {selected.montoDetectado ? formatMonto(selected.montoDetectado) : '—'}
                    {selected.montoReintegro !== undefined && selected.montoDetectado !== undefined && selected.montoReintegro < selected.montoDetectado && (
                      <span className="ml-1 text-amber-600 font-medium">(reintegro: {formatMonto(selected.montoReintegro)})</span>
                    )}
                  </p>
                  {selected.dictamenIA && (
                    <p className="mt-1">
                      {DICTAMEN_CONFIG[selected.dictamenIA as keyof typeof DICTAMEN_CONFIG]?.emoji}{' '}
                      {DICTAMEN_CONFIG[selected.dictamenIA as keyof typeof DICTAMEN_CONFIG]?.label}
                    </p>
                  )}
                  {selected.observacionesIA && (
                    <p className="text-xs text-gray-500 mt-1">{selected.observacionesIA}</p>
                  )}
                </div>
              </div>

              {/* Advertencia excepción */}
              {modalAccion === 'EXCEPCION' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                  ⚡ Estás aprobando una excepción. La IA marcó este ticket como <strong>{selected.dictamenIA}</strong>.
                  Debés justificar el motivo de la excepción.
                </div>
              )}

              {/* Motivo de rechazo */}
              {modalAccion === 'RECHAZAR' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo de rechazo</label>
                  <select
                    value={motivo}
                    onChange={e => setMotivo(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccioná un motivo (opcional)</option>
                    {MOTIVOS.map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {modalAccion === 'RECHAZAR' ? 'Comentario al empleado *' :
                   modalAccion === 'EXCEPCION' ? 'Justificación de la excepción *' :
                   'Comentario (opcional)'}
                </label>
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  rows={3}
                  placeholder={
                    modalAccion === 'RECHAZAR' ? 'Explicá al empleado por qué se rechaza...' :
                    modalAccion === 'EXCEPCION' ? 'Justificá la situación extraordinaria...' :
                    'Observaciones adicionales...'
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setModalAccion(null); setError('') }}
                  className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarAccion}
                  disabled={accionando}
                  className={`flex-1 text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50 transition-colors ${
                    modalAccion === 'RECHAZAR' ? 'bg-red-600 hover:bg-red-700' :
                    modalAccion === 'EXCEPCION' ? 'bg-orange-500 hover:bg-orange-600' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {accionando ? 'Procesando...' :
                   modalAccion === 'RECHAZAR' ? 'Confirmar rechazo' :
                   modalAccion === 'EXCEPCION' ? 'Aprobar excepción' :
                   'Confirmar aprobación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketDetailModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const dictCfg = ticket.dictamenIA ? DICTAMEN_CONFIG[ticket.dictamenIA as keyof typeof DICTAMEN_CONFIG] : null
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">{ticket.usuario.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <img src={ticket.imagenUrl} alt="" className="w-full rounded-xl border border-gray-200" />

          {dictCfg && (
            <div className={`rounded-xl border p-4 ${dictCfg.bg} ${dictCfg.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span>{dictCfg.emoji}</span>
                <span className={`font-semibold text-sm ${dictCfg.color}`}>{dictCfg.label}</span>
                {ticket.confianzaIA !== undefined && (
                  <span className="text-xs text-gray-500 ml-auto">Confianza: {ticket.confianzaIA}%</span>
                )}
              </div>
              {ticket.observacionesIA && <p className="text-sm text-gray-700">{ticket.observacionesIA}</p>}
              {ticket.alertasIA?.map((a, i) => (
                <p key={i} className="text-xs text-gray-600 mt-1">⚠️ {a}</p>
              ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            {ticket.comercioDetectado && <Row label="Comercio" value={ticket.comercioDetectado} />}
            {ticket.montoDetectado ? <Row label="Monto ticket" value={formatMonto(ticket.montoDetectado)} /> : null}
            {ticket.montoReintegro !== undefined && ticket.montoDetectado !== undefined ? (
              <Row
                label="Monto a reintegrar"
                value={formatMonto(ticket.montoReintegro)}
                highlight={ticket.montoReintegro < ticket.montoDetectado}
              />
            ) : null}
            {ticket.fechaDetectada && <Row label="Fecha" value={formatFecha(ticket.fechaDetectada)} />}
            {ticket.horaDetectada && <Row label="Hora" value={ticket.horaDetectada} />}
            <Row label="Sector" value={ticket.usuario.sector?.nombre ?? '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium ${highlight ? 'text-amber-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  )
}
