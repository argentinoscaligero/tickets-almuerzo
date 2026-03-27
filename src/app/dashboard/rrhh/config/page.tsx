'use client'

import { useState, useEffect } from 'react'
import { formatMonto } from '@/lib/utils'

type Config = {
  id: number
  topeDiario: number
  horarioInicio: string
  horarioFin: string
  proveedorIA?: string
}

export default function ConfigRrhhPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [tope, setTope] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [proveedor, setProveedor] = useState('')

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(data => {
      if (data.config) {
        setConfig(data.config)
        setTope(String(data.config.topeDiario))
        setHoraInicio(data.config.horarioInicio)
        setHoraFin(data.config.horarioFin)
        setProveedor(data.config.proveedorIA ?? 'claude')
      }
      setLoading(false)
    })
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setGuardado(false)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topeDiario: parseInt(tope),
          horarioInicio: horaInicio,
          horarioFin: horaFin,
          proveedorIA: proveedor,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setConfig(data.config)
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch {
      setError('Error de red')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="py-16 text-center text-gray-400">
      <div className="text-3xl mb-3 animate-pulse">⚙️</div>
      <p>Cargando configuración...</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Configuración del sistema</h1>
      <p className="text-gray-500 text-sm mb-8">Parámetros de validación de tickets de almuerzo</p>

      {config && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <InfoCard icon="💰" label="Tope diario" value={formatMonto(config.topeDiario)} />
          <InfoCard icon="🕐" label="Horario" value={`${config.horarioInicio} – ${config.horarioFin}`} />
          <InfoCard icon="🤖" label="Proveedor IA" value={(config.proveedorIA ?? 'claude').toUpperCase()} />
        </div>
      )}

      <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tope diario por empleado ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
            <input
              type="number"
              value={tope}
              onChange={e => setTope(e.target.value)}
              min={1}
              max={99999}
              required
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Monto máximo que se reintegra por ticket por día</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horario inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={e => setHoraInicio(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horario fin</label>
            <input
              type="time"
              value={horaFin}
              onChange={e => setHoraFin(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 -mt-4">Ventana horaria válida para tickets de almuerzo</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Proveedor de IA</label>
          <select
            value={proveedor}
            onChange={e => setProveedor(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="ollama">Ollama (local)</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">El proveedor de IA usado para el análisis de imágenes</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
            ⚠️ {error}
          </div>
        )}
        {guardado && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2">
            ✅ Configuración guardada correctamente
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-gray-300 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {saving ? 'Guardando...' : '💾 Guardar configuración'}
        </button>
      </form>

      {/* Info reglas */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">📋 Reglas de validación</p>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• Los tickets se validan solo de lunes a viernes (días hábiles)</li>
          <li>• El horario y el tope aplican tanto para la IA como para la validación manual</li>
          <li>• Cualquier validador puede aprobar excepciones con justificación</li>
          <li>• La IA es orientativa: el humano siempre tiene la última palabra</li>
        </ul>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="font-semibold text-gray-800 text-sm">{value}</div>
    </div>
  )
}
