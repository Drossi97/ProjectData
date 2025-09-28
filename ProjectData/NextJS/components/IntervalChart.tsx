"use client"

import React, { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CSVAnalysisResult, DataInterval, PortAnalysis } from "@/hooks/useCSVProcessor"

interface IntervalChartProps {
  results: CSVAnalysisResult | null
}

interface IntervalClassification {
  type: "docked" | "maneuvering" | "transit" | "undefined"
  description: string
  fromPort?: string
  toPort?: string
  atPort?: string
}

interface ChartDataPoint {
  time: string
  date: string
  timestamp: number
  speed: number | null
  navStatus: string
  navStatusValue: number | null
  classification?: IntervalClassification
  isGap?: boolean // Nueva propiedad para marcar gaps
  isStartPoint?: boolean // Nueva propiedad para marcar puntos de inicio visibles
}

export function IntervalChart({ results }: IntervalChartProps) {
  if (!results || !results.success || !results.data) return null

  // Función de clasificación compartida con NavigationPieChart
  const classifyInterval = (
    navStatus: string,
    startPort: PortAnalysis | undefined,
    endPort: PortAnalysis | undefined
  ): IntervalClassification => {
    // If no port data available
    if (!startPort || !endPort) {
      return {
        type: "undefined",
        description: "undefined - no port data available"
      };
    }

    const samePort = startPort.name === endPort.name;
    const startDistanceDocked = startPort.distance < 4; // 4 km para atracado
    const endDistanceDocked = endPort.distance < 4;
    const startDistanceManeuvering = startPort.distance < 10; // 10 km para maniobrando
    const endDistanceManeuvering = endPort.distance < 10;
    const maxDistanceFromAnyPort = Math.max(startPort.distance, endPort.distance) > 40; // > 40 km = indefinido

    // Rule 1: Docked (atracado) - requiere estar a < 4 km del puerto
    if (navStatus === "0.0" && samePort && startDistanceDocked && endDistanceDocked) {
      return {
        type: "docked",
        description: `docked at ${startPort.name}`,
        atPort: startPort.name
      };
    }

    // Rule 2: Maneuvering (maniobrando) - requiere estar a < 10 km del puerto
    if (navStatus === "1.0" && samePort && startDistanceManeuvering && endDistanceManeuvering) {
      return {
        type: "maneuvering",
        description: `maneuvering at ${startPort.name}`,
        atPort: startPort.name
      };
    }

    // Rule 3: Transit (tránsito)
    if (navStatus === "2.0" && !samePort) {
      return {
        type: "transit",
        description: `in transit from ${startPort.name} to ${endPort.name}`,
        fromPort: startPort.name,
        toPort: endPort.name
      };
    }

    // Rule 4: Undefined (indefinido) - incluye casos donde el barco está > 40 km del puerto más cercano
    return {
      type: "undefined",
      description: maxDistanceFromAnyPort
        ? "Estado indefinido - demasiado lejos de puertos (> 40 km)"
        : "Estado indefinido - condiciones no cumplidas"
    };
  };

  // Estado para controlar qué líneas están visibles
  const [visibleLines, setVisibleLines] = useState({
    speed: true,
    navStatus: true
  })

  // Estado para controlar el zoom
  const [zoomDomain, setZoomDomain] = useState<{startIndex: number, endIndex: number} | null>(null)

  // Estado para el pan (arrastrar)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null)

  // Estado para el hover
  const [hoveredData, setHoveredData] = useState<ChartDataPoint | null>(null)

  // Crear datos del gráfico
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []

    if (!results.data?.intervals || results.data.intervals.length === 0) {
      return data
    }

    // Ordenar intervalos por timestamp
    const sortedIntervals = [...results.data.intervals].sort(
      (a, b) => new Date(`${a.startDate} ${a.startTime}`).getTime() - new Date(`${b.startDate} ${b.startTime}`).getTime()
    )

    sortedIntervals.forEach((interval, index) => {
      const startTimestamp = new Date(`${interval.startDate} ${interval.startTime}`).getTime()
      const endTimestamp = new Date(`${interval.endDate} ${interval.endTime}`).getTime()

      // Classify the interval
      const classification = classifyInterval(interval.navStatus, interval.startPort, interval.endPort);

      // Verificar si hay un gap con el intervalo anterior
      if (index > 0) {
        const prevInterval = sortedIntervals[index - 1]
        const prevEndTimestamp = new Date(`${prevInterval.endDate} ${prevInterval.endTime}`).getTime()
        const gapInSeconds = (startTimestamp - prevEndTimestamp) / 1000

        // Si hay un gap mayor a 0.6 segundos (igual que en useCSVProcessor)
        if (gapInSeconds > 0.6) {
          // Agregar punto de gap (con datos nulos)
          data.push({
            time: new Date(prevEndTimestamp).toTimeString().split(' ')[0].substring(0, 8),
            date: prevInterval.endDate,
            timestamp: prevEndTimestamp,
            speed: null,
            navStatus: 'sin datos',
            navStatusValue: null,
            isGap: true
          })
        }
      }

      // Punto de inicio visible (lo que el usuario ve)
      data.push({
        time: interval.startTime,
        date: interval.startDate,
        timestamp: startTimestamp,
        speed: interval.avgSpeed,
        navStatus: interval.navStatus,
        navStatusValue: parseInt(interval.navStatus) || 0,
        classification,
        isStartPoint: true // Marcar como punto de inicio visible
      })

      // Punto de fin invisible (necesario para stepAfter)
      data.push({
        time: interval.endTime,
        date: interval.endDate,
        timestamp: endTimestamp,
        speed: interval.avgSpeed,
        navStatus: interval.navStatus,
        navStatusValue: parseInt(interval.navStatus) || 0,
        classification
      })
    })

    return data.sort((a, b) => a.timestamp - b.timestamp)
  }, [results.data.intervals])

  // Filtrar datos según zoom
  const visibleData = useMemo(() => {
    if (!zoomDomain) return chartData
    return chartData.slice(zoomDomain.startIndex, zoomDomain.endIndex + 1)
  }, [chartData, zoomDomain])

  // Funciones de control
  const toggleLineVisibility = (lineType: 'speed' | 'navStatus') => {
    setVisibleLines(prev => ({ ...prev, [lineType]: !prev[lineType] }))
  }

  const handleZoom = (zoomIn: boolean) => {
    const totalLength = chartData.length
    const center = Math.floor(totalLength / 2)

    if (zoomIn) {
      // Zoom In
      if (!zoomDomain) {
        // Primera vez: mostrar 50% centrado
        const rangeSize = Math.floor(totalLength * 0.5)
        const start = Math.max(0, center - Math.floor(rangeSize / 2))
        const end = Math.min(totalLength - 1, start + rangeSize)
        setZoomDomain({ startIndex: start, endIndex: end })
      } else {
        // Reducir rango actual
        const currentRange = zoomDomain.endIndex - zoomDomain.startIndex
        if (currentRange > 20) {
          const reduction = Math.floor(currentRange * 0.25)
          const newStart = zoomDomain.startIndex + reduction
          const newEnd = zoomDomain.endIndex - reduction
          setZoomDomain({ startIndex: newStart, endIndex: newEnd })
        }
      }
    } else {
      // Zoom Out
      if (!zoomDomain) return

      const currentRange = zoomDomain.endIndex - zoomDomain.startIndex
      const expansion = Math.floor(currentRange * 0.4)
      const newStart = Math.max(0, zoomDomain.startIndex - expansion)
      const newEnd = Math.min(totalLength - 1, zoomDomain.endIndex + expansion)

      if (newEnd - newStart >= totalLength * 0.9) {
        setZoomDomain(null)
      } else {
        setZoomDomain({ startIndex: newStart, endIndex: newEnd })
      }
    }
  }

  const resetZoom = () => {
    setZoomDomain(null)
  }

  // Funciones para el pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!zoomDomain) return // Solo pan cuando hay zoom
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !zoomDomain) return

    const deltaX = e.clientX - dragStart.x
    const chartWidth = e.currentTarget.getBoundingClientRect().width || 800
    const totalRange = chartData.length
    const currentRange = zoomDomain.endIndex - zoomDomain.startIndex

    // Calcular movimiento proporcional
    const moveRatio = deltaX / chartWidth
    const pointsToMove = Math.round(moveRatio * currentRange * 2)

    let newStart = zoomDomain.startIndex - pointsToMove
    let newEnd = zoomDomain.endIndex - pointsToMove

    // Ajustar límites
    if (newStart < 0) {
      newStart = 0
      newEnd = currentRange
    }
    if (newEnd > totalRange - 1) {
      newEnd = totalRange - 1
      newStart = newEnd - currentRange
    }

    setZoomDomain({ startIndex: newStart, endIndex: newEnd })
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragStart(null)
  }

  // Funciones de formateo
  const formatTimeLabel = (value: string, index: number) => {
    const dataPoint = visibleData[index]
    if (!dataPoint) return value
    return dataPoint.time.substring(0, 5) + 'h'
  }

  const formatDateLabel = (value: string, index: number) => {
    const dataPoint = visibleData[index]
    if (!dataPoint || !dataPoint.date) return value

    if (index > 0) {
      const prevDataPoint = visibleData[index - 1]
      if (prevDataPoint && prevDataPoint.date === dataPoint.date) {
        return ''
      }
    }

    const [year, month, day] = dataPoint.date.split('-')
    return `${day}-${month}`
  }

  // Calcular rangos para ejes Y
  const speedValues = visibleData.map(d => d.speed).filter(v => v !== null) as number[]
  const statusValues = visibleData.map(d => d.navStatusValue).filter(v => v !== null) as number[]

  const minSpeed = speedValues.length > 0 ? Math.min(...speedValues) : 0
  const maxSpeed = speedValues.length > 0 ? Math.max(...speedValues) : 10
  const minStatus = statusValues.length > 0 ? Math.min(...statusValues, 0) : 0
  const maxStatus = statusValues.length > 0 ? Math.max(...statusValues, 2) : 2

  // Función para formatear horas sin milisegundos
  const formatTimeWithoutMs = (timeString: string) => {
    if (!timeString || timeString === '--:--:--') return timeString
    return timeString.split('.')[0] // Quitar todo después del punto (milisegundos)
  }

  // Función para convertir HH:MM:SS a segundos
  const timeToSeconds = (timeString: string): number => {
    if (!timeString || timeString === '--:--:--') return 0
    const parts = timeString.split(':').map(Number)
    if (parts.length !== 3) return 0
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  // Función para formatear duración con unidades apropiadas
  const formatDurationWithUnits = (timeString: string): string => {
    const seconds = timeToSeconds(timeString)
    if (seconds === 0) return '--:--:--'

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

  // Función para formatear horas del día con unidades
  const formatTimeWithUnits = (timeString: string): string => {
    if (!timeString || timeString === '--:--:--') return timeString
    const parts = timeString.split(':').map(Number)
    if (parts.length !== 3) return timeString

    const hours = parts[0]
    const minutes = parts[1]
    const seconds = parts[2]

    return `${hours}h ${minutes}m ${seconds}s`
  }

  // Función para formatear fecha de YYYY-MM-DD a DD/MM/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === '--') return '--'
    const parts = dateString.split('-')
    if (parts.length !== 3) return dateString

    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }

  // Encontrar el intervalo actual basado en el timestamp del hover
  const currentInterval = useMemo(() => {
    if (!hoveredData || hoveredData.isGap) return null

    // Buscar intervalos que contengan el timestamp con una tolerancia
    const matchingIntervals = results.data?.intervals.filter(interval => {
      const intervalStart = new Date(`${interval.startDate} ${interval.startTime}`).getTime()
      const intervalEnd = new Date(`${interval.endDate} ${interval.endTime}`).getTime()
      return hoveredData.timestamp >= intervalStart && hoveredData.timestamp <= intervalEnd
    }) || []

    if (matchingIntervals.length === 0) return null

    // Si hay múltiples intervalos, priorizar el que tenga el timestamp más cercano al inicio
    if (matchingIntervals.length > 1) {
      return matchingIntervals.reduce((closest, current) => {
        const currentStart = new Date(`${current.startDate} ${current.startTime}`).getTime()
        const closestStart = new Date(`${closest.startDate} ${closest.startTime}`).getTime()
        const currentDistance = Math.abs(hoveredData.timestamp - currentStart)
        const closestDistance = Math.abs(hoveredData.timestamp - closestStart)
        return currentDistance < closestDistance ? current : closest
      })
    }

    return matchingIntervals[0]
  }, [hoveredData, results.data?.intervals])


  return (
    <Card style={{ backgroundColor: '#171717', borderColor: '#2C2C2C' }}>
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">Gráfico de Intervalos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Gráfico principal */}
          <div
            className="flex-1 min-w-0"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              cursor: isDragging ? 'grabbing' : (zoomDomain ? 'grab' : 'default'),
              userSelect: 'none'
            }}
          >
            {/* Controles superiores - Solo zoom */}
            <div className="flex justify-end items-center mb-4 flex-wrap gap-4">
              {/* Botones de zoom (esquina derecha) */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleZoom(true)}
                  className="px-3 py-1 text-sm rounded-lg transition-all duration-200 hover:bg-gray-700"
                  style={{
                    backgroundColor: '#2C2C2C',
                    color: '#9CA3AF'
                  }}
                >
                  🔍+
                </button>

                <button
                  onClick={() => handleZoom(false)}
                  className="px-3 py-1 text-sm rounded-lg transition-all duration-200 hover:bg-gray-700"
                  style={{
                    backgroundColor: '#2C2C2C',
                    color: '#9CA3AF'
                  }}
                >
                  🔍-
                </button>

                <button
                  onClick={resetZoom}
                  className="px-3 py-1 text-sm rounded-lg transition-all duration-200 hover:bg-gray-700"
                  style={{
                    backgroundColor: '#2C2C2C',
                    color: '#9CA3AF'
                  }}
                >
                  ↻
                </button>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={visibleData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
                onMouseMove={(data) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    setHoveredData(data.activePayload[0].payload)
                  }
                }}
                onMouseLeave={() => setHoveredData(null)}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2C2C2C"
                  opacity={0.3}
                />

                {/* Eje X superior para fechas */}
                <XAxis
                  xAxisId="dates"
                  dataKey="date"
                  orientation="top"
                  stroke="#9CA3AF"
                  fontSize={10}
                  angle={0}
                  textAnchor="middle"
                  height={30}
                  interval={0}
                  tickFormatter={formatDateLabel}
                  axisLine={false}
                  tickLine={false}
                />

                {/* Eje X inferior para horas */}
                <XAxis
                  xAxisId="times"
                  dataKey="time"
                  orientation="bottom"
                  stroke="#9CA3AF"
                  fontSize={10}
                  angle={0}
                  textAnchor="middle"
                  height={30}
                  interval={Math.floor(visibleData.length / 8)}
                  tickFormatter={formatTimeLabel}
                />

                <YAxis
                  yAxisId="speed"
                  orientation="left"
                  stroke="#3B82F6"
                  fontSize={12}
                  domain={[minSpeed, maxSpeed]}
                  label={{
                    value: 'Velocidad (nudos)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#3B82F6' }
                  }}
                />

                <YAxis
                  yAxisId="status"
                  orientation="right"
                  stroke="#10B981"
                  fontSize={12}
                  domain={[minStatus, maxStatus]}
                  type="number"
                  allowDecimals={false}
                  tickFormatter={(value) => `${Math.round(value)}`}
                  label={{
                    value: 'Estado',
                    angle: 90,
                    position: 'insideRight',
                    style: { textAnchor: 'middle', fill: '#10B981' }
                  }}
                />

                {/* Tooltip para mostrar solo el cursor (línea blanca) */}
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: '#FFFFFF', strokeWidth: 2 }}
                  content={() => null}
                />

                {/* Intervalos de velocidad */}
                {visibleLines.speed && (
                  <>
                    <Line
                      xAxisId="times"
                      yAxisId="speed"
                      type="stepAfter"
                      dataKey="speed"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                    {/* Línea punteada para gaps de velocidad */}
                    <Line
                      xAxisId="times"
                      yAxisId="speed"
                      type="stepAfter"
                      dataKey={(entry: any) => entry?.isGap ? null : entry?.speed}
                      stroke="#3B82F6"
                      strokeWidth={1}
                      strokeDasharray="5,5"
                      dot={false}
                      connectNulls={false}
                    />
                  </>
                )}

                {/* Intervalos de NavStatus */}
                {visibleLines.navStatus && (
                  <>
                    <Line
                      xAxisId="times"
                      yAxisId="status"
                      type="stepAfter"
                      dataKey="navStatusValue"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                    />
                    {/* Línea punteada para gaps de navStatus */}
                    <Line
                      xAxisId="times"
                      yAxisId="status"
                      type="stepAfter"
                      dataKey={(entry: any) => entry?.isGap ? null : entry?.navStatusValue}
                      stroke="#10B981"
                      strokeWidth={2}
                      strokeDasharray="5,5"
                      dot={false}
                      connectNulls={false}
                    />
                  </>
                )}

                {/* Área de referencia para mostrar gaps visualmente */}
                {(() => {
                  const gapAreas: any[] = []
                  visibleData.forEach((dataPoint, index) => {
                    if (dataPoint.isGap && index < visibleData.length - 1) {
                      const nextDataPoint = visibleData[index + 1]
                      if (nextDataPoint && !nextDataPoint.isGap) {
                        gapAreas.push({
                          x1: dataPoint.timestamp,
                          x2: nextDataPoint.timestamp,
                          fill: 'rgba(255, 255, 255, 0.1)',
                          fillOpacity: 0.3
                        })
                      }
                    }
                  })
                  return gapAreas.map((area, index) => (
                    <ReferenceArea
                      key={`gap-${index}`}
                      x1={area.x1}
                      x2={area.x2}
                      fill={area.fill}
                      fillOpacity={area.fillOpacity}
                    />
                  ))
                })()}

                {/* Texto "SIN DATOS" en los gaps */}
                {(() => {
                  const gapTexts: any[] = []
                  visibleData.forEach((dataPoint, index) => {
                    if (dataPoint.isGap && index < visibleData.length - 1) {
                      const nextDataPoint = visibleData[index + 1]
                      if (nextDataPoint && !nextDataPoint.isGap) {
                        const gapDuration = nextDataPoint.timestamp - dataPoint.timestamp
                        const gapHours = gapDuration / (1000 * 60 * 60)

                        // Solo mostrar texto si el gap es mayor a 1 hora
                        if (gapHours > 1) {
                          gapTexts.push({
                            x: (dataPoint.timestamp + nextDataPoint.timestamp) / 2,
                            y: (minSpeed + maxSpeed) / 2,
                            text: 'SIN DATOS'
                          })
                        }
                      }
                    }
                  })
                  return gapTexts.map((text, index) => (
                    <text
                      key={`gap-text-${index}`}
                      x={text.x}
                      y={text.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="bold"
                      opacity={0.7}
                    >
                      {text.text}
                    </text>
                  ))
                })()}
              </LineChart>
            </ResponsiveContainer>

            {/* Controles inferiores - Leyenda visual */}
            <div className="flex justify-center items-center gap-6 flex-wrap mt-4">
              {/* Velocidad */}
              <button
                onClick={() => toggleLineVisibility('speed')}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  visibleLines.speed
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-blue-300'
                }`}
              >
                <div className={`w-4 h-0.5 ${
                  visibleLines.speed ? 'bg-blue-400' : 'bg-gray-600'
                }`}></div>
                Velocidad
              </button>

              {/* Estado */}
              <button
                onClick={() => toggleLineVisibility('navStatus')}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  visibleLines.navStatus
                    ? 'text-green-400'
                    : 'text-gray-400 hover:text-green-300'
                }`}
              >
                <div className={`w-4 h-0.5 ${
                  visibleLines.navStatus ? 'bg-green-400' : 'bg-gray-600'
                }`}></div>
                Estado
              </button>
            </div>

          </div>

          {/* Panel de información */}
          <div className="lg:w-40 space-y-3">
            {/* Título del panel */}
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white mb-2">Información de intervalos</h3>
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent"></div>
            </div>
            <div className="space-y-1">
              {/* 1. Estado (NavStatus) */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: hoveredData && !hoveredData.isGap ? '#10B981' : '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Estado</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-lg font-bold text-green-400 text-center">
                    {hoveredData?.isGap ? 'Sin datos' : (hoveredData?.navStatus || '--')}
                  </div>
                </div>
              </div>

              {/* 2. Actividad */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: hoveredData && !hoveredData.isGap ? '#8B5CF6' : '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Actividad</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm font-bold text-purple-400 text-center">
                    {hoveredData && !hoveredData.isGap && hoveredData?.classification ? (
                      <div>
                        <div className="text-xs text-center">
                          {hoveredData.classification.type === 'docked' && 'ATRACADO'}
                          {hoveredData.classification.type === 'maneuvering' && 'MANIOBRANDO'}
                          {hoveredData.classification.type === 'transit' && 'TRÁNSITO'}
                          {hoveredData.classification.type === 'undefined' && 'Estado indefinido'}
                        </div>
                        {hoveredData.classification.atPort && (
                          <div className="text-xs text-gray-300 mt-1 text-center">
                            en {hoveredData.classification.atPort}
                          </div>
                        )}
                        {hoveredData.classification.fromPort && hoveredData.classification.toPort && (
                          <div className="text-xs text-gray-300 mt-1 text-center">
                            {hoveredData.classification.fromPort} → {hoveredData.classification.toPort}
                          </div>
                        )}
                      </div>
                    ) : (
                      '--'
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Velocidad Media */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: hoveredData && !hoveredData.isGap ? '#3B82F6' : '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Velocidad Media</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-lg font-bold text-blue-400 text-center">
                    {hoveredData && !hoveredData.isGap ? (hoveredData?.speed?.toFixed(2) || '--') : '--'}
                    <span className="text-xs font-normal ml-1">kn</span>
                  </div>
                </div>
              </div>

              {/* 4. Duración */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Duración</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm font-bold text-orange-400 font-mono text-center">
                    {currentInterval?.duration ? formatDurationWithUnits(currentInterval.duration) : '--:--:--'}
                  </div>
                </div>
              </div>

              {/* 5. Hora Inicial */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Hora Inicial</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm font-bold text-white font-mono text-center">
                    {currentInterval?.startTime ? formatTimeWithUnits(currentInterval.startTime) : '--:--:--'}
                  </div>
                </div>
              </div>

              {/* 6. Hora Final */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Hora Final</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm font-bold text-white font-mono text-center">
                    {currentInterval?.endTime ? formatTimeWithUnits(currentInterval.endTime) : '--:--:--'}
                  </div>
                </div>
              </div>

              {/* 7. Fecha */}
              <div
                className="pl-2 pr-2 pt-1 pb-2 rounded-md border h-20 flex flex-col"
                style={{ backgroundColor: '#2C2C2C', borderColor: '#2C2C2C' }}
              >
                <div className="text-xs text-gray-400 leading-tight">Fecha</div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-sm font-bold text-cyan-400 text-center">
                    {hoveredData && !hoveredData.isGap ?
                      formatDate(hoveredData?.date || currentInterval?.startDate || '--') :
                      '--'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
