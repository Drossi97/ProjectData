import React from "react"

// Colores para los trayectos - mejorados para mejor visibilidad
const JOURNEY_COLORS = [
  '#FF4444', // Rojo brillante
  '#00AA44', // Verde oscuro
  '#0066CC', // Azul oscuro
  '#FF8800', // Naranja brillante
  '#8800AA', // Morado oscuro
  '#CC6600', // Marrón oscuro
  '#00AAAA', // Cian oscuro
  '#AA4400', // Rojo oscuro
  '#0044AA', // Azul muy oscuro
  '#AA0088'  // Magenta oscuro
]

interface Journey {
  index: number
  startPort: string
  intervalCount: number
}

interface JourneySelectorProps {
  availableJourneys: Journey[]
  selectedJourneys: Set<number>
  onToggleJourney: (journeyIndex: number) => void
  onClearMap: () => void
}

export default function JourneySelector({ 
  availableJourneys, 
  selectedJourneys, 
  onToggleJourney, 
  onClearMap 
}: JourneySelectorProps) {
  console.log('🔍 JourneySelector render - selectedJourneys:', Array.from(selectedJourneys))
  console.log('🔍 JourneySelector render - availableJourneys:', availableJourneys)
  
  if (availableJourneys.length === 0) {
    return null
  }

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 max-w-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-white font-medium">Seleccionar Trayecto</h4>
            <button
              onClick={onClearMap}
              className="text-gray-400 hover:text-white text-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto panel-scroll">
            {availableJourneys.map((journey) => {
              const isSelected = selectedJourneys.has(journey.index)
              console.log(`🔍 Journey ${journey.index}: isSelected = ${isSelected}`)
              
              return (
                <button
                  key={journey.index}
                  onClick={() => onToggleJourney(journey.index)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 border-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                  }`}
                >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: JOURNEY_COLORS[journey.index % JOURNEY_COLORS.length] }}
                  />
                  <span className="font-medium">
                    Trayecto {journey.index + 1}: {journey.startPort}
                  </span>
                  {selectedJourneys.has(journey.index) && (
                    <span className="ml-auto text-blue-300">✓</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {journey.intervalCount} intervalos
                </div>
              </button>
              )
            })}
          </div>
          
          {selectedJourneys.size > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-600">
              <div className="text-xs text-gray-400">
                Seleccionados: {selectedJourneys.size} trayecto{selectedJourneys.size > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
