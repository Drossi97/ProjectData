"use client"

import React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CSVAnalysisResult } from "@/hooks/useCSVProcessor"
import { ScrollArea } from "@/components/ui/scroll-area"

interface IntervalsTableProps {
  results: CSVAnalysisResult | null
}

export function IntervalsTable({ results }: IntervalsTableProps) {
  if (!results || !results.success || !results.data) return null

  const { intervals } = results.data

  // Formatear fecha y hora
  const formatDateTime = (date: string, time: string) => {
    return `${date} ${time}`
  }

  // Formatear duración
  const formatDuration = (duration: string) => {
    const parts = duration.split(':')
    if (parts.length === 3) {
      const hours = parseInt(parts[0])
      const minutes = parseInt(parts[1])
      const seconds = parseInt(parts[2])

      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
      if (minutes > 0) return `${minutes}m ${seconds}s`
      return `${seconds}s`
    }
    return duration
  }

  return (
    <Card style={{ backgroundColor: '#171717', borderColor: '#2C2C2C' }}>
      <CardHeader>
        <CardTitle className="text-white text-xl font-semibold">
          Tabla de Intervalos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-600">
                <TableHead className="text-gray-300 font-semibold text-left py-3">Inicio</TableHead>
                <TableHead className="text-gray-300 font-semibold text-left py-3">Fin</TableHead>
                <TableHead className="text-gray-300 font-semibold text-center py-3 w-16">Estado</TableHead>
                <TableHead className="text-gray-300 font-semibold text-left py-3">Actividad</TableHead>
                <TableHead className="text-gray-300 font-semibold text-left py-3">Duración</TableHead>
                <TableHead className="text-gray-300 font-semibold text-left py-3">Velocidad</TableHead>
                <TableHead className="text-gray-300 font-semibold text-left py-3">Muestras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intervals.map((interval, index) => (
                <TableRow
                  key={index}
                  className="border-gray-700 hover:bg-gray-800/30"
                >
                  <TableCell className="text-gray-200 font-mono text-sm py-4 px-4">
                    {formatDateTime(interval.startDate, interval.startTime)}
                  </TableCell>
                  <TableCell className="text-gray-200 font-mono text-sm py-4 px-4">
                    {formatDateTime(interval.endDate, interval.endTime)}
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="flex items-center justify-center w-full h-full">
                      <span className="text-gray-200 text-sm font-medium">
                        {interval.navStatus}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-200 text-sm py-4 px-4">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {(() => {
                          // Clasificación simple basada en navStatus
                          switch (interval.navStatus) {
                            case '0.0':
                              return interval.startPort?.name ? `Atracado en ${interval.startPort.name}` : 'Atracado'
                            case '1.0':
                              return interval.startPort?.name ? `Maniobrando en ${interval.startPort.name}` : 'Maniobrando'
                            case '2.0':
                              if (interval.startPort?.name && interval.endPort?.name) {
                                return `${interval.startPort.name} → ${interval.endPort.name}`
                              }
                              return 'En tránsito'
                            default:
                              return 'Estado indefinido'
                          }
                        })()}
                      </div>
                      {interval.navStatus === '2.0' && interval.startPort?.name && interval.endPort?.name && (
                        <div className="text-xs text-gray-400">
                          Tránsito marítimo
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-200 font-mono text-sm py-4 px-4">
                    {formatDuration(interval.duration)}
                  </TableCell>
                  <TableCell className="text-gray-200 text-sm py-4 px-4">
                    {interval.avgSpeed ? `${interval.avgSpeed.toFixed(1)} nudos` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-gray-200 text-sm py-4 px-4">
                    {interval.sampleCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
