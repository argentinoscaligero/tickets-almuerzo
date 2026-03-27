'use client'

import { useState, useEffect } from 'react'

type Empleado = {
  id: string
  nombre: string
  email: string
  activo: boolean
  sector?: { nombre: string }
  planilla?: { nombre: string }
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [buscar, setBuscar] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      fetch(`/api/empleados?q=${encodeURIComponent(buscar)}`)
        .then(r => r.json())
        .then(data => { setEmpleados(data.empleados ?? []); setLoading(false) })
    }, 300)
    return () => clearTimeout(timer)
  }, [buscar])

  // Agrupar por planilla
  const porPlanilla = empleados.reduce<Record<string, Empleado[]>>((acc, e) => {
    const p = e.planilla?.nombre ?? 'Sin planilla'
    if (!acc[p]) acc[p] = []
    acc[p].push(e)
    return acc
  }, {})

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Empleados</h1>
      <p className="text-gray-500 text-sm mb-6">{empleados.length} empleados activos</p>

      <div className="mb-6">
        <input
          type="text"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
          placeholder="🔍 Buscar por nombre o email..."
          className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="animate-pulse text-3xl mb-3">👥</div>
          <p>Cargando empleados...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(porPlanilla).map(([planilla, emps]) => (
            <div key={planilla} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 text-sm">📋 {planilla}</h2>
                <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{emps.length}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sector</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {emps.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{e.nombre}</td>
                      <td className="px-4 py-2.5 text-gray-500">{e.email}</td>
                      <td className="px-4 py-2.5 text-gray-500">{e.sector?.nombre ?? '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${e.activo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {e.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
