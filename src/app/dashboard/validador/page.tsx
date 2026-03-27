'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatFecha, formatMonto, DICTAMEN_CONFIG, ESTADO_CONFIG, MOTIVO_LABEL } from '@/lib/utils'

type Ticket = {
  id: string
  usuarioId: string
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
    id: string
    nombre: string
    email: string
    sector?: { nombre: string }
    planilla?: { nombre: string }
  }
  acciones?: { tipo: string; comentario?: string; creadoEn: string; usuario: { nombre: string } }[]
}

type EmpleadoGroup = {
  usuario: Ticket['usuario']
  tickets: Ticket[]
  pendientes: Ticket[]
  montoTotal: number
  dictamenPeor: 'VERDE' | 'AMARILLO' | 'ROJO' | null
}

const MOTIVOS = Object.entries(MOTIVO_LABEL)
const PESO_DICTAMEN: Record<string, number> = { VERDE: 1, AMARILLO: 2, ROJO: 3 }

function peorDictamen(tickets: Ticket[]): 'VERDE' | 'AMARILLO' | 'ROJO' | null {
  let peor: 'VERDE' | 'AMARILLO' | 'ROJO' | null = null
  for (const t of tickets) {
    if (!t.dictamenIA) continue
    const d = t.dictamenIA as 'VERDE' | 'AMARILLO' | 'ROJO'
    if (!peor || PESO_DICTAMEN[d] > PESO_DICTAMEN[peor]) peor = d
  }
  return peor
}

function getSemanaActual() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((hoy.getTime() - startOfYear.getTime()) / 86400000) + 1
  return `${year}-W${String(Math.ceil(dayOfYear / 7)).padStart(2, '0')}`
}

export default function ValidadorPage() {
  const [semana, setSemana] = useState(getSemanaActual)
  const [grupos, setGrupos] = useState<EmpleadoGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<EmpleadoGroup | null>(null)

  function buildGrupos(tickets: Ticket[]): Map<string, EmpleadoGroup> {
    const map = new Map<string, EmpleadoGroup>()
    for (const t of tickets) {
      const uid = t.usuario?.id ?? t.usuarioId
      if (!map.has(uid)) {
        map.set(uid, { usuario: { ...t.usuario, id: uid }, tickets: [], pendientes: [], montoTotal: 0, dictamenPeor: null })
      }
      const g = map.get(uid)!
      g.tickets.push(t)
      if (t.estado === 'PENDIENTE_VALIDADOR') g.pendientes.push(t)
      g.montoTotal += Number(t.montoReintegro ?? t.montoDetectado ?? 0)
    }
    for (const g of map.values()) g.dictamenPeor = peorDictamen(g.pendientes)
    return map
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets?semana=${semana}&limit=200`)
    if (res.ok) {
      const data = await res.json()
      const map = buildGrupos(data.tickets)
      setGrupos([...map.values()].sort((a, b) => b.pendientes.length - a.pendientes.length))
    }
    setLoading(false)
  }, [semana]) // eslint-disable-line

  useEffect(() => { cargar() }, [cargar])

  const recargarYActualizarModal = useCallback(async (empleadoId: string) => {
    const res = await fetch(`/api/tickets?semana=${semana}&limit=200`)
    if (!res.ok) return
    const data = await res.json()
    const map = buildGrupos(data.tickets)
    setGrupos([...map.values()].sort((a, b) => b.pendientes.length - a.pendientes.length))
    setSelectedGroup(map.get(empleadoId) ?? null)
  }, [semana]) // eslint-disable-line

  const totalEmpleados = grupos.length
  const totalPendientes = grupos.reduce((s, g) => s + g.pendientes.length, 0)
  const totalMonto = grupos.reduce((s, g) => s + g.montoTotal, 0)
  const totalTickets = grupos.reduce((s, g) => s + g.tickets.length, 0)

  const porSector: Record<string, { empleados: EmpleadoGroup[]; monto: number }> = {}
  for (const g of grupos) {
    const sector = g.usuario.sector?.nombre ?? 'Sin sector'
    if (!porSector[sector]) porSector[sector] = { empleados: [], monto: 0 }
    porSector[sector].empleados.push(g)
    porSector[sector].monto += g.montoTotal
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Revisión de Tickets</h1>
      <p className="text-gray-500 text-sm mb-6">Validá los tickets de los empleados de tu sector</p>

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-600">Semana:</label>
        <input
          type="text"
          value={semana}
          onChange={e => setSemana(e.target.value)}
          placeholder="2025-W12"
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono w-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button onClick={cargar} className="px-4 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Empleados" value={String(totalEmpleados)} icon="👥" color="blue" />
        <StatCard label="Pendientes" value={String(totalPendientes)} icon="⏳" color={totalPendientes > 0 ? 'yellow' : 'green'} />
        <StatCard label="Total tickets" value={String(totalTickets)} icon="🍽️" color="gray" />
        <StatCard label="Monto semana" value={formatMonto(totalMonto)} icon="💰" color="green" />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <div className="text-3xl mb-3 animate-pulse">⏳</div>
          <p>Cargando tickets...</p>
        </div>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-medium">No hay tickets para esta semana</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">Empleados · {semana}</h2>
              {totalPendientes > 0 && (
                <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2.5 py-1 font-medium">
                  {totalPendientes} pendiente{totalPendientes !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleado</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendientes</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reintegro</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">IA</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grupos.map(g => {
                  const dictCfg = g.dictamenPeor ? DICTAMEN_CONFIG[g.dictamenPeor] : null
                  const tienePendientes = g.pendientes.length > 0
                  return (
                    <tr key={g.usuario.id} className={`hover:bg-gray-50 transition-colors ${tienePendientes ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{g.usuario.nombre}</div>
                        <div className="text-xs text-gray-400">{g.usuario.planilla?.nombre}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{g.usuario.sector?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600 font-medium">{g.tickets.length}</td>
                      <td className="px-4 py-3 text-center">
                        {tienePendientes ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                            {g.pendientes.length}
                          </span>
                        ) : <span className="text-green-500 text-lg">✓</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">
                        {g.montoTotal > 0 ? formatMonto(g.montoTotal) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {dictCfg ? <span title={dictCfg.label} className="text-lg">{dictCfg.emoji}</span> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedGroup(g)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                            tienePendientes
                              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {tienePendientes ? '✓ Revisar' : 'Ver'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={4} className="px-4 py-2.5 text-sm font-semibold text-gray-700">Total semana</td>
                  <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-800">{formatMonto(totalMonto)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-700 text-sm">📊 Consolidado por sector · {semana}</h2>
            </div>
            {Object.entries(porSector).map(([sector, data]) => (
              <div key={sector} className="border-b border-gray-100 last:border-0">
                <div className="px-4 py-2.5 bg-gray-50/60 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{sector}</span>
                  <span className="text-sm font-bold text-gray-800">{formatMonto(data.monto)}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {data.empleados.map(g => (
                      <tr key={g.usuario.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-2 text-gray-700">{g.usuario.nombre}</td>
                        <td className="px-4 py-2 text-center text-gray-500">{g.tickets.length} ticket{g.tickets.length !== 1 ? 's' : ''}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{g.montoTotal > 0 ? formatMonto(g.montoTotal) : '—'}</td>
                        <td className="px-4 py-2 text-center">
                          {g.pendientes.length > 0
                            ? <span className="text-xs bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5">Pendiente</span>
                            : g.tickets.length > 0
                            ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Revisado</span>
                            : <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">Sin tickets</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedGroup && (
        <EmpleadoModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onRefresh={() => recargarYActualizarModal(selectedGroup.usuario.id)}
        />
      )}
    </div>
  )
}

function EmpleadoModal({ group, onClose, onRefresh }: { group: EmpleadoGroup; onClose: () => void; onRefresh: () => void }) {
  const [accionTicket, setAccionTicket] = useState<Ticket | null>(null)
  const [modalAccion, setModalAccion] = useState<'APROBAR' | 'RECHAZAR' | 'EXCEPCION' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [comentario, setComentario] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [imagenGrande, setImagenGrande] = useState<string | null>(null)

  async function ejecutarAccion() {
    if (!accionTicket || !modalAccion) return
    if ((modalAccion === 'RECHAZAR' || modalAccion === 'EXCEPCION') && !comentario.trim()) {
      setError('El comentario es obligatorio')
      return
    }
    setProcesando(true)
    setError('')
    try {
      const res = await fetch(`/api/tickets/${accionTicket.id}/accion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: modalAccion, motivo: motivo || undefined, comentario: comentario || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setModalAccion(null)
      setAccionTicket(null)
      setMotivo('')
      setComentario('')
      await onRefresh()
    } catch {
      setError('Error de red')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">{group.usuario.nombre}</h3>
              <p className="text-sm text-gray-500">
                {[group.usuario.sector?.nombre, group.usuario.planilla?.nombre].filter(Boolean).join(' · ')}
                {' · '}{group.tickets.length} ticket{group.tickets.length !== 1 ? 's' : ''}
                {group.montoTotal > 0 ? ` · ${formatMonto(group.montoTotal)}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {group.tickets.length === 0
              ? <p className="text-center text-gray-400 py-8">Sin tickets esta semana</p>
              : group.tickets.map(t => (
                  <TicketCard key={t.id} ticket={t}
                    onAccion={(ticket, accion) => { setAccionTicket(ticket); setModalAccion(accion) }}
                    onVerImagen={url => setImagenGrande(url)}
                  />
                ))
            }
          </div>
        </div>
      </div>

      {imagenGrande && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setImagenGrande(null)}>
          <img src={imagenGrande} alt="Ticket" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}

      {accionTicket && modalAccion && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {modalAccion === 'APROBAR' ? '✓ Aprobar ticket' : modalAccion === 'EXCEPCION' ? '⚡ Aprobar con excepción' : '✕ Rechazar ticket'}
              </h3>
              <button onClick={() => { setModalAccion(null); setError('') }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
                <img src={accionTicket.imagenUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200 shrink-0 cursor-pointer" onClick={() => setImagenGrande(accionTicket.imagenUrl)} />
                <div className="text-sm space-y-0.5">
                  <p className="font-medium text-gray-800">{accionTicket.comercioDetectado || 'Sin comercio detectado'}</p>
                  <p className="text-gray-500">
                    {accionTicket.montoDetectado ? formatMonto(accionTicket.montoDetectado) : '—'}
                    {accionTicket.montoReintegro !== undefined && accionTicket.montoDetectado !== undefined && accionTicket.montoReintegro < accionTicket.montoDetectado && (
                      <span className="ml-1 text-amber-600">(reintegro: {formatMonto(accionTicket.montoReintegro)})</span>
                    )}
                  </p>
                  {accionTicket.fechaDetectada && <p className="text-gray-400 text-xs">{formatFecha(accionTicket.fechaDetectada)}{accionTicket.horaDetectada ? ` · ${accionTicket.horaDetectada}` : ''}</p>}
                  {accionTicket.observacionesIA && <p className="text-xs text-gray-500">{accionTicket.observacionesIA}</p>}
                </div>
              </div>

              {modalAccion === 'EXCEPCION' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                  ⚡ Aprobás pese a que la IA marcó <strong>{accionTicket.dictamenIA}</strong>. Justificá.
                </div>
              )}

              {modalAccion === 'RECHAZAR' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Motivo de rechazo</label>
                  <select value={motivo} onChange={e => setMotivo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Seleccioná un motivo (opcional)</option>
                    {MOTIVOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {modalAccion === 'RECHAZAR' ? 'Comentario al empleado *' : modalAccion === 'EXCEPCION' ? 'Justificación *' : 'Comentario (opcional)'}
                </label>
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={modalAccion === 'RECHAZAR' ? 'Explicá al empleado el motivo...' : modalAccion === 'EXCEPCION' ? 'Justificá la situación extraordinaria...' : 'Observaciones adicionales...'}
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">⚠️ {error}</div>}

              <div className="flex gap-3">
                <button onClick={() => { setModalAccion(null); setError('') }} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50">Cancelar</button>
                <button
                  onClick={ejecutarAccion}
                  disabled={procesando}
                  className={`flex-1 text-white font-medium rounded-lg py-2.5 text-sm disabled:opacity-50 transition-colors ${
                    modalAccion === 'RECHAZAR' ? 'bg-red-600 hover:bg-red-700' : modalAccion === 'EXCEPCION' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {procesando ? 'Procesando...' : modalAccion === 'RECHAZAR' ? 'Confirmar rechazo' : modalAccion === 'EXCEPCION' ? 'Aprobar excepción' : 'Confirmar aprobación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TicketCard({ ticket, onAccion, onVerImagen }: {
  ticket: Ticket
  onAccion: (t: Ticket, accion: 'APROBAR' | 'RECHAZAR' | 'EXCEPCION') => void
  onVerImagen: (url: string) => void
}) {
  const dictCfg = ticket.dictamenIA ? DICTAMEN_CONFIG[ticket.dictamenIA as keyof typeof DICTAMEN_CONFIG] : null
  const estadoCfg = ESTADO_CONFIG[ticket.estado]
  const isPendiente = ticket.estado === 'PENDIENTE_VALIDADOR'

  return (
    <div className={`border rounded-xl overflow-hidden ${isPendiente ? 'border-yellow-200' : 'border-gray-200'}`}>
      <div className="flex gap-4 p-4">
        <button onClick={() => onVerImagen(ticket.imagenUrl)} className="shrink-0 self-start">
          <img src={ticket.imagenUrl} alt="Ticket" className="w-24 h-24 rounded-xl object-cover border border-gray-200 hover:scale-105 transition-transform" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-semibold text-gray-800 truncate">
              {ticket.comercioDetectado || <span className="text-gray-400 font-normal text-sm">Comercio no detectado</span>}
            </span>
            <span className={`text-xs font-medium rounded-full px-2.5 py-1 shrink-0 ${estadoCfg?.bg ?? 'bg-gray-100'} ${estadoCfg?.color ?? 'text-gray-600'}`}>
              {estadoCfg?.label ?? ticket.estado}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
            <span className="text-gray-600">
              💰 {ticket.montoDetectado ? formatMonto(ticket.montoDetectado) : <span className="text-gray-300">no detectado</span>}
              {ticket.montoReintegro !== undefined && ticket.montoDetectado !== undefined && ticket.montoReintegro < ticket.montoDetectado && (
                <span className="text-amber-600 ml-1 text-xs">(reintegra {formatMonto(ticket.montoReintegro)})</span>
              )}
            </span>
            <span className={ticket.fechaDetectada ? 'text-gray-600' : 'text-gray-300'}>
              📅 {ticket.fechaDetectada ? formatFecha(ticket.fechaDetectada) : 'no detectada'}
            </span>
            <span className={ticket.horaDetectada ? 'text-gray-600' : 'text-gray-300'}>
              🕐 {ticket.horaDetectada || 'no detectada'}
            </span>
            {ticket.confianzaIA !== undefined && (
              <span className="text-gray-400 text-xs self-center">🤖 Confianza {ticket.confianzaIA}%</span>
            )}
          </div>
          {dictCfg && (
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border mb-2 ${dictCfg.bg} ${dictCfg.color} ${dictCfg.border}`}>
              {dictCfg.emoji} {dictCfg.label}
            </span>
          )}
          {ticket.observacionesIA && <p className="text-xs text-gray-500 mb-1">{ticket.observacionesIA}</p>}
          {ticket.alertasIA && ticket.alertasIA.length > 0 && (
            <ul className="space-y-0.5">
              {ticket.alertasIA.map((a, i) => <li key={i} className="text-xs text-amber-700 flex gap-1">⚠️ <span>{a}</span></li>)}
            </ul>
          )}
        </div>
      </div>
      {isPendiente && (
        <div className="flex gap-2 px-4 pb-4">
          <button onClick={() => onAccion(ticket, 'APROBAR')} className="flex-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">✓ Aprobar</button>
          {(ticket.dictamenIA === 'ROJO' || ticket.dictamenIA === 'AMARILLO') && (
            <button onClick={() => onAccion(ticket, 'EXCEPCION')} className="flex-1 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors">⚡ Excepción</button>
          )}
          <button onClick={() => onAccion(ticket, 'RECHAZAR')} className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">✕ Rechazar</button>
        </div>
      )}
      {ticket.acciones && ticket.acciones.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50">
          {ticket.acciones.map((a, i) => (
            <p key={i} className="text-xs text-gray-500">
              <span className="font-medium">{a.usuario.nombre}</span> · {a.tipo.replace(/_/g, ' ')} · {formatFecha(a.creadoEn)}
              {a.comentario ? <span className="italic text-gray-400"> — "{a.comentario}"</span> : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', yellow: 'bg-yellow-50 border-yellow-100', gray: 'bg-gray-50 border-gray-200' }
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? colors.gray}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
