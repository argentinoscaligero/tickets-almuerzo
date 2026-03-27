'use client'

import { useState, useEffect } from 'react'
import { formatMonto } from '@/lib/utils'

type PreviewEmpleado = {
  empleadoId: string
  nombre: string
  sector: string
  tickets: any[]
  total: number
}

type PreviewPlanilla = {
  planilla: string
  empleados: PreviewEmpleado[]
  subtotal: number
}

type Liquidacion = {
  id: string
  semana: string
  totalMonto: number
  totalTickets: number
  creadoEn: string
}

function getSemanaActual() {
  const hoy = new Date()
  const year = hoy.getFullYear()
  const startOfYear = new Date(year, 0, 1)
  const dayOfYear = Math.floor((hoy.getTime() - startOfYear.getTime()) / 86400000) + 1
  const weekNum = Math.ceil(dayOfYear / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

export default function TesoresiaPage() {
  const [semana, setSemana] = useState(getSemanaActual)
  const [preview, setPreview] = useState<PreviewPlanilla[] | null>(null)
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    fetch('/api/liquidaciones').then(r => r.json()).then(d => {
      setLiquidaciones(d.liquidaciones ?? [])
    })
  }, [])

  async function cargarPreview() {
    setLoadingPreview(true)
    setError('')
    setPreview(null)
    const res = await fetch(`/api/liquidaciones?semana=${semana}&preview=true`)
    const data = await res.json()
    if (res.ok) {
      setPreview(data.preview)
      setTotalGeneral(data.totalGeneral)
      setTotalTickets(data.totalTickets)
    } else {
      setError(data.error)
    }
    setLoadingPreview(false)
  }

  async function procesarLiquidacion() {
    if (!confirm(`¿Confirmar liquidación de la semana ${semana}? Esto marcará ${totalTickets} tickets como PAGADO.`)) return
    setProcesando(true)
    setError('')
    setExito('')
    const res = await fetch('/api/liquidaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semana }),
    })
    const data = await res.json()
    if (res.ok) {
      setExito(`✅ Liquidación procesada: ${totalTickets} tickets · ${formatMonto(totalGeneral)}`)
      setPreview(null)
      const resLiq = await fetch('/api/liquidaciones')
      const dLiq = await resLiq.json()
      setLiquidaciones(dLiq.liquidaciones ?? [])
    } else {
      setError(data.error)
    }
    setProcesando(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Liquidaciones de Tesorería</h1>
      <p className="text-gray-500 text-sm mb-8">Procesá el pago semanal de tickets aprobados</p>

      {/* Selector semana */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">📋 Nueva liquidación</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Semana</label>
            <input
              type="text"
              value={semana}
              onChange={e => setSemana(e.target.value)}
              placeholder="2025-W45"
              pattern="\d{4}-W\d{2}"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            />
          </div>
          <button
            onClick={cargarPreview}
            disabled={loadingPreview}
            className="px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {loadingPreview ? '⏳ Cargando...' : '🔍 Ver preview'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">⚠️ {error}</div>
      )}
      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-4">{exito}</div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-3 mb-5">
            <SummaryCard icon="💰" label="Total a liquidar" value={formatMonto(totalGeneral)} color="green" />
            <SummaryCard icon="🍽️" label="Tickets" value={String(totalTickets)} color="blue" />
            <SummaryCard icon="📋" label="Planillas" value={String(preview.length)} color="purple" />
          </div>

          <div className="space-y-4 mb-5">
            {preview.map(p => (
              <div key={p.planilla} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700 text-sm">📋 {p.planilla}</h3>
                  <span className="font-semibold text-gray-800 text-sm">{formatMonto(p.subtotal)}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {p.empleados.map((e: PreviewEmpleado) => (
                      <tr key={e.empleadoId} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{e.nombre}</td>
                        <td className="px-4 py-2.5 text-gray-500">{e.sector}</td>
                        <td className="px-4 py-2.5 text-center text-gray-500">
                          {e.tickets.length} {e.tickets.length === 1 ? 'ticket' : 'tickets'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                          {formatMonto(e.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <button
            onClick={procesarLiquidacion}
            disabled={procesando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {procesando ? '⏳ Procesando...' : `💰 Procesar liquidación — ${formatMonto(totalGeneral)}`}
          </button>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700 text-sm">📜 Historial de liquidaciones</h2>
        </div>
        {liquidaciones.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-3xl mb-2">📜</div>
            <p className="text-sm">No hay liquidaciones procesadas</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Semana</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Total</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Tickets</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {liquidaciones.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">{l.semana}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatMonto(l.totalMonto)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{l.totalTickets}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">{new Date(l.creadoEn).toLocaleDateString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  }
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
    </div>
  )
}
