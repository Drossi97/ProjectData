import React, { useState, useRef, useEffect } from "react"
import { useCSVProcessor } from "../hooks/useCSVProcessor"
import CSVUploader from "./CSVUploader"
import JourneySelector from "./JourneySelector"
import MapViewer, { MapViewerRef } from "./MapViewer"

export default function App() {
  const [files, setFiles] = useState<File[]>([])
  const [selectedJourneys, setSelectedJourneys] = useState<Set<number>>(new Set())
  const [availableJourneys, setAvailableJourneys] = useState<Array<{index: number, startPort: string, intervalCount: number}>>([])
  
  const mapViewerRef = useRef<MapViewerRef>(null)
  const csvProcessor = useCSVProcessor()

  // Debug: Log cuando cambie selectedJourneys
  useEffect(() => {
    console.log('🔍 selectedJourneys cambió:', Array.from(selectedJourneys))
  }, [selectedJourneys])


  // Procesar archivos CSV
  const handleProcessFiles = async () => {
    if (files.length === 0 || csvProcessor.isProcessing) return

    console.log('=== PROCESANDO ARCHIVOS CSV ===')
    
    try {
      const result = await csvProcessor.processFiles(files)
      
      if (result?.success && 'data' in result && result.data) {
        console.log(`✅ Procesamiento completado: ${result.data.intervals.length} intervalos`)
        
        // Preparar lista de trayectos directamente con el resultado
        prepareJourneysListFromResult(result.data)
      } else {
        console.error('❌ Error en el procesamiento:', result?.error)
      }
    } catch (error) {
      console.error('Error procesando archivos:', error)
    }
  }

  // Preparar lista de trayectos directamente desde el resultado del procesamiento
  const prepareJourneysListFromResult = (data: any) => {
    const intervals = data.intervals
    const journeyMap = new Map<number, {index: number, startPort: string, intervalCount: number}>()
    
    intervals.forEach((interval: any) => {
      const journeyIndex = interval.journeyIndex || 0
      if (!journeyMap.has(journeyIndex)) {
        journeyMap.set(journeyIndex, {
          index: journeyIndex,
          startPort: interval.startPort?.name || 'Desconocido',
          intervalCount: 0
        })
      }
      journeyMap.get(journeyIndex)!.intervalCount++
    })

    const journeys = Array.from(journeyMap.values()).sort((a, b) => a.index - b.index)
    console.log('🔍 Journeys preparados:', journeys)
    
    setAvailableJourneys(journeys)
    
    // No seleccionar automáticamente ningún trayecto - que aparezcan deseleccionados
    setSelectedJourneys(new Set())
    
    console.log(`Trayectos disponibles: ${journeys.length}`)
    console.log(`📋 Panel de trayectos listo - ninguno seleccionado inicialmente`)
  }

  // Preparar lista de trayectos disponibles y mostrar automáticamente todos
  const prepareJourneysList = () => {
    if (!csvProcessor.results?.success || !csvProcessor.results.data) return

    const intervals = csvProcessor.results.data.intervals
    const journeyMap = new Map<number, {index: number, startPort: string, intervalCount: number}>()
    
    intervals.forEach(interval => {
      const journeyIndex = interval.journeyIndex || 0
      if (!journeyMap.has(journeyIndex)) {
        journeyMap.set(journeyIndex, {
          index: journeyIndex,
          startPort: interval.startPort?.name || 'Desconocido',
          intervalCount: 0
        })
      }
      journeyMap.get(journeyIndex)!.intervalCount++
    })

    const journeys = Array.from(journeyMap.values()).sort((a, b) => a.index - b.index)
    setAvailableJourneys(journeys)
    
    // Automáticamente seleccionar y mostrar todos los trayectos
    const allJourneyIndexes = new Set(journeys.map(j => j.index))
    setSelectedJourneys(allJourneyIndexes)
    
    console.log(`Trayectos disponibles: ${journeys.length}`)
    console.log(`🚀 Mostrando automáticamente ${allJourneyIndexes.size} trayectos`)
  }

  // Alternar selección de trayecto
  const toggleJourneySelection = (journeyIndex: number) => {
    console.log(`=== ALTERNANDO TRAYECTO ${journeyIndex} ===`)
    
    const newSelectedJourneys = new Set(selectedJourneys)
    
    if (newSelectedJourneys.has(journeyIndex)) {
      // Deseleccionar trayecto
      newSelectedJourneys.delete(journeyIndex)
      console.log(`Trayecto ${journeyIndex} deseleccionado`)
    } else {
      // Seleccionar trayecto
      newSelectedJourneys.add(journeyIndex)
      console.log(`Trayecto ${journeyIndex} seleccionado`)
    }
    
    setSelectedJourneys(newSelectedJourneys)
  }

  // Limpiar mapa y resetear selecciones
  const clearMap = () => {
    mapViewerRef.current?.clearMap()
    setSelectedJourneys(new Set())
    setAvailableJourneys([])
    csvProcessor.clearResults()
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Mapa */}
      <MapViewer 
        ref={mapViewerRef}
        intervals={csvProcessor.results?.data?.intervals || []}
        selectedJourneys={selectedJourneys}
      />

      {/* Componente para subir CSV */}
      <CSVUploader
        files={files}
        onFilesChange={setFiles}
        onProcessFiles={handleProcessFiles}
        isProcessing={csvProcessor.isProcessing}
        hasResults={!!csvProcessor.results?.success}
      />

      {/* Componente para seleccionar trayectos */}
      <JourneySelector
        availableJourneys={availableJourneys}
        selectedJourneys={selectedJourneys}
        onToggleJourney={toggleJourneySelection}
        onClearMap={clearMap}
      />
    </div>
  )
}