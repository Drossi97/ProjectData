import { useState } from "react"
import { useCSVConverter, type RawDataRow } from "./useCSVConverter"

// Puerto coordinates
const PORTS = [
  { name: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
  { name: "Tanger Med", lat: 35.880312709, lon: -5.515627045 },
  { name: "Ceuta", lat: 35.889, lon: -5.307 }
]

export interface PortAnalysis {
  name: string
  distance: number
}

export interface CoordinatePoint {
  lat: number
  lon: number
  timestamp: string
  speed: number | null
  navStatus: string
}

export interface EnhancedDataInterval {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  navStatus: string
  duration: string
  avgSpeed: number | null
  sampleCount: number
  startLat: number | null
  startLon: number | null
  endLat: number | null
  endLon: number | null
  endReason: string
  // Puerto analysis
  startPort?: PortAnalysis
  endPort?: PortAnalysis
  // Journey assignment
  journeyIndex?: number | null
  classificationType?: string
  // Coordenadas múltiples
  coordinates: CoordinatePoint[]
  totalDistance?: number
}

export interface IntervalProcessingResult {
  success: boolean
  data?: {
    intervals: EnhancedDataInterval[]
    summary: {
      totalIntervals: number
      totalRows: number
      filesProcessed: number
      navigationIntervals: number
      anchoredIntervals: number
      totalCoordinatePoints: number
    }
  }
  error?: string
  meta?: {
    processedFiles: Array<{ file: string; rows: number }>
    errors: string[]
  }
}

// Helper functions
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const findNearestPort = (lat: number, lon: number): PortAnalysis => {
  let nearestPort = PORTS[0]
  let minDistance = calculateDistance(lat, lon, nearestPort.lat, nearestPort.lon)
  
  for (const port of PORTS) {
    const distance = calculateDistance(lat, lon, port.lat, port.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearestPort = port
    }
  }
  
  return {
    name: nearestPort.name,
    distance: minDistance
  }
}

const calculateTimeDifference = (startTime: string, endTime: string): string => {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
    
    return `${hours}h ${minutes}m ${seconds}s`
  } catch {
    return "0h 0m 0s"
  }
}

const calculateAverageSpeed = (points: CoordinatePoint[]): number | null => {
  const validSpeeds = points
    .map(p => p.speed)
    .filter(speed => speed !== null && speed !== undefined && !isNaN(speed)) as number[]
  
  if (validSpeeds.length === 0) return null
  
  return validSpeeds.reduce((sum, speed) => sum + speed, 0) / validSpeeds.length
}

const classifyInterval = (points: CoordinatePoint[]): string => {
  const navStatuses = points.map(p => p.navStatus)
  const uniqueStatuses = [...new Set(navStatuses)]
  
  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0] === "1.0" ? "Navegación" : "Atracado"
  }
  
  return "Mixto"
}

const assignJourneyIndex = (intervals: EnhancedDataInterval[]): void => {
  let currentJourneyIndex = 0
  let lastPort = ""
  
  intervals.forEach((interval, index) => {
    const startPort = interval.startPort
    const navStatus = interval.navStatus
    
    // Si está cerca de un puerto y en estado 0.0, podría ser inicio de trayecto
    if (navStatus === "0.0" && startPort && startPort.distance <= 3) {
      // Si es un puerto diferente al anterior o es el primer intervalo
      if (startPort.name !== lastPort || index === 0) {
        currentJourneyIndex++
        lastPort = startPort.name
      }
    }
    
    interval.journeyIndex = currentJourneyIndex
  })
}

const createIntervalFromPoints = (points: CoordinatePoint[], startTime: string, startDate: string): EnhancedDataInterval | null => {
  if (points.length === 0) return null

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  
  // Calcular distancia total del intervalo
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    totalDistance += calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon)
  }

  // Análisis de puertos
  const startPort = findNearestPort(firstPoint.lat, firstPoint.lon)
  const endPort = findNearestPort(lastPoint.lat, lastPoint.lon)

  const interval: EnhancedDataInterval = {
    startDate: startDate,
    startTime: startTime,
    endDate: lastPoint.timestamp.split(' ')[0],
    endTime: lastPoint.timestamp,
    navStatus: firstPoint.navStatus,
    duration: calculateTimeDifference(startTime, lastPoint.timestamp),
    avgSpeed: calculateAverageSpeed(points),
    sampleCount: points.length,
    startLat: firstPoint.lat,
    startLon: firstPoint.lon,
    endLat: lastPoint.lat,
    endLon: lastPoint.lon,
    endReason: "Cambio de estado",
    startPort: startPort.distance <= 5 ? startPort : undefined,
    endPort: endPort.distance <= 5 ? endPort : undefined,
    journeyIndex: null, // Se asignará después
    classificationType: classifyInterval(points),
    coordinates: points,
    totalDistance: totalDistance
  }

  return interval
}

export function useCSVProcessor() {
  const csvConverter = useCSVConverter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<IntervalProcessingResult | null>(null)

  const processFiles = async (files: File[], delimiter: string = ",") => {
    if (files.length === 0) {
      setResults(null)
      return null
    }

    setIsProcessing(true)
    setResults(null)

    try {
      console.log('=== PROCESANDO ARCHIVOS CSV CON INTERVALOS COMPLETOS ===')
      
      // Paso 1: Convertir CSV a JSON puro usando useCSVConverter
      console.log('1. Convirtiendo CSV a JSON...')
      const csvResult = await csvConverter.processFiles(files, delimiter)
      
      if (!csvResult?.success || !('data' in csvResult) || !csvResult.data) {
        const errorResult = {
          success: false,
          error: csvResult?.error || "Error en la conversión de datos",
          meta: csvResult?.meta ? {
            processedFiles: csvResult.meta.processedFiles,
            errors: csvResult.meta.errors
          } : undefined
        }
        setResults(errorResult)
        return errorResult
      }

      console.log(`✅ CSV convertido: ${csvResult.data.length} filas`)
      
      // Paso 2: Procesar intervalos con coordenadas múltiples
      console.log('2. Procesando intervalos con coordenadas múltiples...')
      const rawData = csvResult.data
      
      if (!rawData || rawData.length === 0) {
        return {
          success: false,
          error: "No hay datos para procesar"
        }
      }

      const intervals: EnhancedDataInterval[] = []
      let currentInterval: CoordinatePoint[] = []
      let intervalStartTime = ""
      let intervalStartDate = ""

      // Procesar cada fila de datos
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i]
        const currentTime = row.timestamp
        const currentDate = row.date
        const navStatus = row.navStatus

        // Si es la primera fila o cambió el estado de navegación
        if (i === 0 || currentInterval.length === 0 || 
            (currentInterval.length > 0 && currentInterval[currentInterval.length - 1].navStatus !== navStatus)) {
          
          // Si había un intervalo previo, procesarlo
          if (currentInterval.length > 0) {
            const interval = createIntervalFromPoints(currentInterval, intervalStartTime, intervalStartDate)
            if (interval) {
              intervals.push(interval)
            }
          }
          
          // Iniciar nuevo intervalo
          currentInterval = []
          intervalStartTime = currentTime
          intervalStartDate = currentDate
        }

        // Agregar punto al intervalo actual si tiene coordenadas válidas
        if (row.latitude !== null && row.longitude !== null && 
            !isNaN(row.latitude) && !isNaN(row.longitude)) {
          
          currentInterval.push({
            lat: row.latitude,
            lon: row.longitude,
            timestamp: currentTime,
            speed: row.speed,
            navStatus: navStatus
          })
        }
      }

      // Procesar el último intervalo
      if (currentInterval.length > 0) {
        const interval = createIntervalFromPoints(currentInterval, intervalStartTime, intervalStartDate)
        if (interval) {
          intervals.push(interval)
        }
      }

      // Asignar índices de trayecto
      assignJourneyIndex(intervals)

      // Calcular estadísticas
      const totalCoordinatePoints = intervals.reduce((sum, interval) => sum + interval.coordinates.length, 0)
      const navigationIntervals = intervals.filter(i => i.navStatus === "1.0").length
      const anchoredIntervals = intervals.filter(i => i.navStatus === "0.0").length

      const finalResult: IntervalProcessingResult = {
        success: true,
        data: {
          intervals,
          summary: {
            totalIntervals: intervals.length,
            totalRows: rawData.length,
            filesProcessed: csvResult.meta?.filesProcessed || 0,
            navigationIntervals,
            anchoredIntervals,
            totalCoordinatePoints
          }
        },
        meta: csvResult.meta ? {
          processedFiles: csvResult.meta.processedFiles,
          errors: csvResult.meta.errors
        } : undefined
      }

      setResults(finalResult)
      console.log(`✅ Procesamiento completado: ${intervals.length} intervalos, ${totalCoordinatePoints} puntos de coordenadas`)
      return finalResult

    } catch (error) {
      console.error('Error procesando archivos:', error)
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        meta: {
          processedFiles: [],
          errors: [error instanceof Error ? error.message : "Error desconocido"]
        }
      }
      setResults(errorResult)
      return errorResult
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResults = () => {
    csvConverter.clearResults()
    setResults(null)
  }

  // Estado combinado
  const isProcessingCombined = isProcessing || csvConverter.isProcessing

  return {
    results,
    isProcessing: isProcessingCombined,
    processFiles,
    clearResults,
    // Exponer también el hook CSV converter para acceso directo si es necesario
    csvConverter
  }
}
