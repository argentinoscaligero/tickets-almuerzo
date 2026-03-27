'use client'

import { useState, useEffect } from 'react'
import { formatMonto } from '@/lib/utils'

type Counts = {
  subidos: number
  analizando: number
  pendValidador: number
  pendControlador: number
  pendRrhh: number
  enTesoreria: number
  pagados: number
  rechazados: number
}

export default function AdminPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/tickets?limit=10').then(r => r.json()),
    ]).then(([tData]) => {
      setTickets(tData.tickets ?? [])
      // Calcular counts del listado completo (simplificado)
      setLoading(false)
    })
  }, [])

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Panel de Administración</h1>
      <p className="text-gray-500 text-sm mb-8">Vista global del sistema</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <QuickLinkCard href="/dashboard/validador" icon="📋" label="Validador" color="blue" />
        <QuickLinkCard href="/dashboard/controlador" icon="🔍" label="Controlador" color="indigo" />
        <QuickLinkCard href="/dashboard/rrhh" icon="✅" label="RRHH" color="green" />
        <QuickLinkCard href="/dashboard/tesoreria" icon="💰" label="Tesorería" color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700 text-sm">Últimos tickets</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Cargando...</div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-gray-400">Sin tickets aún</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Empleado</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Comercio</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Monto</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Estado</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase">IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{t.usuario?.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-500">{t.comercioDetectado || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{t.montoDetectado ? formatMonto(t.montoDetectado) : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{t.estado}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {t.dictamenIA === 'VERDE' ? '🟢' : t.dictamenIA === 'AMARILLO' ? '🟡' : t.dictamenIA === 'ROJO' ? '🔴' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function QuickLinkCard({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    green: 'bg-green-50 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
  }
  return (
    <a href={href} className={`border rounded-xl p-4 transition-colors ${colors[color]} block`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-medium text-gray-700 text-sm">{label}</div>
    </a>
  )
}
