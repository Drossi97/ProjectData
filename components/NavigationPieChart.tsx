"use client"

import React from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CSVAnalysisResult } from "@/hooks/useCSVProcessor"

interface NavigationPieChartProps {
  results: CSVAnalysisResult | null
}

interface PortActivity {
  id: string
  name: string
  duration: number
  type: 'docked' | 'maneuvering' | 'transit' | 'undefined'
  port: string
  color: string
}

  // Colores para cada tipo de actividad portuaria
const ACTIVITY_COLORS: Record<string, string> = {
  "docked_ceuta": "#6B7280",      // Gris para atracado en Ceuta
  "docked_algeciras": "#4B5563",  // Gris oscuro para atracado en Algeciras
  "docked_tangermed": "#374151",  // Gris más oscuro para atracado en TangerMed
  "maneuvering_ceuta": "#F59E0B", // Amarillo para maniobrando en Ceuta
  "maneuvering_algeciras": "#D97706", // Amarillo oscuro para maniobrando en Algeciras
  "maneuvering_tangermed": "#B45309", // Amarillo más oscuro para maniobrando en TangerMed
  "transit_ceuta_algeciras": "#10B981", // Verde para tránsito Ceuta → Algeciras
  "transit_ceuta_tangermed": "#059669", // Verde oscuro para tránsito Ceuta → TangerMed
  "transit_algeciras_ceuta": "#047857", // Verde más oscuro para tránsito Algeciras → Ceuta
  "transit_algeciras_tangermed": "#065F46", // Verde muy oscuro para tránsito Algeciras → TangerMed
  "transit_tangermed_ceuta": "#064E3B", // Verde esmeralda oscuro para tránsito TangerMed → Ceuta
  "transit_tangermed_algeciras": "#0F766E", // Verde azulado para tránsito TangerMed → Algeciras
  "undefined": "#EF4444", // Rojo para intervalos indefinidos
}

export function NavigationPieChart({ results }: NavigationPieChartProps) {
  if (!results || !results.success || !results.data) {
    return null
  }

  // Función para convertir duración HH:MM:SS a segundos
  const durationToSeconds = (duration: string): number => {
    const parts = duration.split(':').map(Number)
    if (parts.length !== 3) return 0
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  // Función para convertir segundos a HH:MM:SS
  const secondsToDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Función para formatear duración con unidades apropiadas
  const formatDurationWithUnits = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 3600))
    const hours = Math.floor((seconds % (24 * 3600)) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Función para obtener el color basado en el tipo y puertos
  const getActivityColor = (type: string, startPort: string, endPort?: string): string => {
    const normalizedStartPort = startPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed')
    const normalizedEndPort = endPort ? endPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed') : ''

    if (type === 'docked') {
      return ACTIVITY_COLORS[`docked_${normalizedStartPort}`] || '#6B7280'
    } else if (type === 'maneuvering') {
      return ACTIVITY_COLORS[`maneuvering_${normalizedStartPort}`] || '#F59E0B'
    } else if (type === 'transit' && normalizedEndPort) {
      const transitKey = `transit_${normalizedStartPort}_${normalizedEndPort}`
      return ACTIVITY_COLORS[transitKey] || '#10B981'
    }

    return '#10B981' // Color por defecto
  }

  // Procesar intervalos para crear actividades portuarias detalladas
  const portActivities = results.data.intervals.reduce((acc: PortActivity[], interval) => {
    const durationSeconds = durationToSeconds(interval.duration)

    if (!interval.startPort || !interval.endPort) {
      return acc
    }

    const startPort = interval.startPort.name
    const endPort = interval.endPort.name
    const navStatus = interval.navStatus

    // Determinar el tipo de actividad basado en navStatus y puertos
    const startDistanceDocked = interval.startPort.distance < 4; // 4 km para atracado
    const endDistanceDocked = interval.endPort.distance < 4;
    const startDistanceManeuvering = interval.startPort.distance < 10; // 10 km para maniobrando
    const endDistanceManeuvering = interval.endPort.distance < 10;
    const maxDistanceFromAnyPort = Math.max(interval.startPort.distance, interval.endPort.distance) > 40; // > 40 km = indefinido

    // Rule 1: Docked (atracado) - requiere estar a < 4 km del puerto
    if (navStatus === "0.0" && startPort === endPort && startDistanceDocked && endDistanceDocked) {
      // Atracado en un puerto específico
      const activityId = `docked_${startPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed')}`
      acc.push({
        id: activityId,
        name: `Atracado en ${startPort}`,
        duration: durationSeconds,
        type: 'docked',
        port: startPort,
        color: getActivityColor('docked', startPort)
      })
    // Rule 2: Maneuvering (maniobrando) - requiere estar a < 10 km del puerto
    } else if (navStatus === "1.0" && startPort === endPort && startDistanceManeuvering && endDistanceManeuvering) {
      // Maniobrando en un puerto específico
      const activityId = `maneuvering_${startPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed')}`
      acc.push({
        id: activityId,
        name: `Maniobrando en ${startPort}`,
        duration: durationSeconds,
        type: 'maneuvering',
        port: startPort,
        color: getActivityColor('maneuvering', startPort)
      })
    } else if (navStatus === "2.0" && startPort !== endPort) {
      // Navegando desde un puerto hacia otro
      const routeId = `${startPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed')}_${endPort.toLowerCase().replace(' ', '').replace('tanger med', 'tangermed')}`
      const transitActivityId = `transit_${routeId}`
      acc.push({
        id: transitActivityId,
        name: `Navegando ${startPort} → ${endPort}`,
        duration: durationSeconds,
        type: 'transit',
        port: `${startPort} → ${endPort}`,
        color: getActivityColor('transit', startPort, endPort)
      })
    } else {
      // Intervalos indefinidos (no cumplen ninguna condición específica o están > 40 km del puerto más cercano)
      acc.push({
        id: 'undefined',
        name: maxDistanceFromAnyPort ? 'Estado indefinido' : 'Indefinido',
        duration: durationSeconds,
        type: 'undefined',
        port: maxDistanceFromAnyPort ? 'Estado indefinido' : 'Desconocido',
        color: ACTIVITY_COLORS['undefined']
      })
    }

    return acc
  }, [])

  // Agrupar por actividad y calcular duraciones totales
  const activityGroups = portActivities.reduce((acc: any, activity) => {
    if (!acc[activity.id]) {
      acc[activity.id] = {
        id: activity.id,
        name: activity.name,
        duration: 0,
        type: activity.type,
        port: activity.port,
        color: activity.color,
        count: 0
      }
    }

    acc[activity.id].duration += activity.duration
    acc[activity.id].count++

    return acc
  }, {})

  // Convertir a formato para el gráfico
  const chartData = Object.values(activityGroups)
    .map((group: any) => ({
      id: group.id,
      name: group.name,
      value: group.duration,
      type: group.type,
      port: group.port,
      color: group.color
    }))
    .sort((a: any, b: any) => b.value - a.value) // Ordenar por duración descendente

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const totalDuration = chartData.reduce((sum, item) => sum + item.value, 0)
      const percentage = ((data.value / totalDuration) * 100).toFixed(1)

      return (
        <div className="p-3 rounded-lg shadow-lg"
             style={{ backgroundColor: '#2C2C2C' }}>
          <p className="text-white font-medium">{data.name}</p>
          <p className="text-gray-300">
            {formatDurationWithUnits(data.value)} ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <style jsx>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4B5563 #2C2C2C;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2C2C2C;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4B5563;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6B7280;
        }
      `}</style>
      <Card style={{ backgroundColor: '#171717', borderColor: '#2C2C2C' }}>
        <CardHeader>
          <CardTitle className="text-white text-xl font-semibold">Distribución de la actividad del barco</CardTitle>
        </CardHeader>
      <CardContent>
        <div className="w-full">
          {/* Gráfico de quesos */}
          <div className="w-full" style={{ height: '450px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={140}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Leyenda y estadísticas */}
          <div className="w-full mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[800px] overflow-y-auto custom-scrollbar">
              {chartData.map((activity, index) => {
                const totalDuration = chartData.reduce((sum, item) => sum + item.value, 0)
                const percentage = ((activity.value / totalDuration) * 100).toFixed(1)

                return (
                  <div key={activity.id}
                       className="p-4 rounded-md flex items-center justify-between w-full"
                       style={{ backgroundColor: '#2C2C2C' }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: activity.color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-base">{activity.port}</div>
                        <div className="text-gray-400 text-sm">
                          {activity.type === 'docked' ? 'Atracado' :
                           activity.type === 'maneuvering' ? 'Maniobrando' :
                           activity.type === 'transit' ? 'Navegando' : 'Indefinido'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-gray-300 font-medium text-base">{formatDurationWithUnits(activity.value)}</div>
                      <div className="text-gray-400 text-sm">{percentage}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
