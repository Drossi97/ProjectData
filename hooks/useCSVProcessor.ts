import { useState } from "react"

export interface PortAnalysis {
  name: string
  distance: number
}

export interface DataInterval {
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
  // New fields for port analysis
  startPort?: PortAnalysis
  endPort?: PortAnalysis
}

export interface RawDataRow {
  timestamp: string
  date: string
  time: string
  latitude: number | null
  longitude: number | null
  speed: number | null
  navStatus: string
  closestPort?: PortAnalysis
  [key: string]: any // Para incluir todas las demás columnas del CSV original
}

export interface RawDataResult {
  success: boolean
  data?: RawDataRow[]
  error?: string
  meta?: {
    totalRows: number
    filesProcessed: number
  }
}

export interface CSVAnalysisResult {
  success: boolean
  data?: {
    intervals: DataInterval[]
    summary: {
      totalIntervals: number
      totalRows: number
      filesProcessed: number
      navigationIntervals: number
      anchoredIntervals: number
    }
  }
  error?: string
  meta?: {
    processedFiles: Array<{ file: string; rows: number }>
    errors: string[]
  }
}

export function useCSVProcessor() {
  const [results, setResults] = useState<CSVAnalysisResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const processCSVData = async (
    fileContents: Array<{ name: string; content: string }>,
    delimiter: string = ","
  ): Promise<CSVAnalysisResult> => {
    try {
      // Constants (from csvToJson.js)
      const COL_LAT = "00-lathr [deg]"
      const COL_LON = "01-lonhr [deg]"
      const COL_SPEED = "04-speed [knots]"
      const COL_NAVSTATUS = "06-navstatus [adim]"
      const COL_TIME = "time"

      // Helper functions (copied from csvToJson.js)
      const parseTimestampParts = (timestamp: string) => {
        if (!timestamp || typeof timestamp !== "string") return null
        const parts = timestamp.split(" ")
        if (parts.length < 2) return null
        return { date: parts[0], time: parts[1], raw: timestamp }
      }

      const getTimeDifferenceInSeconds = (timestamp1: string, timestamp2: string) => {
        try {
          const date1 = new Date(timestamp1)
          const date2 = new Date(timestamp2)
          if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return null
          return Math.abs((date2.getTime() - date1.getTime()) / 1000)
        } catch (error) {
          return null
        }
      }

      const hasTimeGap = (prevTimestamp: string, currentTimestamp: string, maxGapSeconds = 0.6) => {
        const diffSeconds = getTimeDifferenceInSeconds(prevTimestamp, currentTimestamp)
        return diffSeconds !== null && diffSeconds > maxGapSeconds
      }

      const csvTextToRows = (csvString: string) => {
        if (!csvString || csvString.trim().length === 0) return []
        const lines = csvString.replace(/\r\n?/g, "\n").trim().split("\n")
        if (lines.length < 2) return []
        const delim = delimiter === "\\t" || delimiter === "tab" ? "\t" : delimiter
        const headers = lines[0].split(delim).map((h) => h.trim())
        const hasNavstatusHeader = headers.some((h) => h.toLowerCase().includes("navstatus"))
        const hasTimeHeader = headers.some((h) => h.trim() === COL_TIME)
        if (!hasNavstatusHeader || !hasTimeHeader) return []

        return lines.slice(1).map((line) => {
          const values = line.split(delim).map((v) => v.trim())
          const row: any = {}
          headers.forEach((header, idx) => {
            const key = header || `column_${idx}`
            const value = values[idx]
            row[key] = value === "" || value === undefined ? null : value
          })
          return row
        })
      }

      const getCoords = (row: any) => {
        if (!row) return { lat: null, lon: null }
        const lat = Number.parseFloat(row[COL_LAT])
        const lon = Number.parseFloat(row[COL_LON])
        return {
          lat: Number.isNaN(lat) ? null : lat,
          lon: Number.isNaN(lon) ? null : lon,
        }
      }

      const averageSpeed = (rows: any[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return null
        const speeds = rows
          .map((r) => {
            const v = r?.[COL_SPEED]
            const n = v === "" || v == null ? Number.NaN : Number.parseFloat(v)
            return Number.isNaN(n) || n < 0 ? null : n
          })
          .filter((n) => n != null)
        if (speeds.length === 0) return null
        const sum = speeds.reduce((a, b) => a + b, 0)
        return Math.round((sum / speeds.length) * 100) / 100
      }

      const diffHms = (startTime: string, endTime: string) => {
        const start = new Date(`2000-01-01T${startTime}`)
        const end = new Date(`2000-01-01T${endTime}`)
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "00:00:00"
        if (end < start) end.setDate(end.getDate() + 1)
        const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
        const hh = String(Math.floor(seconds / 3600)).padStart(2, "0")
        const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")
        const ss = String(seconds % 60).padStart(2, "0")
        return `${hh}:${mm}:${ss}`
      }

      // Port coordinates
      const ports = [
        { name: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
        { name: "Tanger Med", lat: 35.880312709, lon: -5.515627045 },
        { name: "Ceuta", lat: 35.889, lon: -5.307 }
      ];

      // Function to calculate distance between two points (Haversine)
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100) / 100;
      };

      // Function to find closest port
      const findClosestPort = (lat: number | null, lon: number | null): PortAnalysis | undefined => {
        if (lat === null || lon === null) return undefined;
        
        const distances = ports.map(port => ({
          name: port.name,
          distance: calculateDistance(lat, lon, port.lat, port.lon)
        }));
        
        distances.sort((a, b) => a.distance - b.distance);
        return distances[0];
      };


      // Process all files
      let combined: any[] = []
      const processedFiles: Array<{ file: string; rows: number }> = []
      const errors: string[] = []

      for (const { name, content } of fileContents) {
        try {
          const rows = csvTextToRows(content)
          if (rows.length === 0) {
            errors.push(`Archivo sin datos válidos: ${name}`)
          } else {
            combined = combined.concat(rows)
            processedFiles.push({ file: name, rows: rows.length })
          }
        } catch (error) {
          errors.push(`Error procesando ${name}: ${error instanceof Error ? error.message : "Error desconocido"}`)
        }
      }

      if (combined.length === 0) {
        return {
          success: false,
          error: "No se pudieron leer filas válidas",
          meta: { processedFiles, errors },
        }
      }

      // Use the same logic as csvToJson.js for computing intervals
      const computeNavigationIntervals = (rows: any[]) => {
        if (!Array.isArray(rows) || rows.length === 0) return []
        const intervals: DataInterval[] = []
        let currentStatus: string | null = null
        let startTime: string | null = null,
          startDate: string | null = null,
          startRawTs: string | null = null,
          startIndex = 0
        let prevTimestamp: string | null = null

        // Function to create an interval (copied from csvToJson.js)
        function createInterval(endIndex: number, endTimestamp: string, endParts: any, reason = "status_change") {
          if (!startRawTs || !currentStatus) return
          
          const prevTime = startRawTs.split(" ")[1]
          const currTime = endTimestamp.split(" ")[1]
          const duration = diffHms(prevTime, currTime)
          const chunk = rows.slice(startIndex, endIndex)
          const avg = averageSpeed(chunk)
          const first = rows[startIndex]
          const last = rows[endIndex - 1]
          const cStart = getCoords(first)
          const cEnd = getCoords(last)

          // Closest port analysis
          const startPort = findClosestPort(cStart.lat, cStart.lon);
          const endPort = findClosestPort(cEnd.lat, cEnd.lon);

          intervals.push({
            startDate: startDate!,
            startTime: startTime!,
            endDate: endParts.date,
            endTime: endParts.time,
            navStatus: currentStatus,
            duration,
            avgSpeed: avg,
            sampleCount: chunk.length,
            startLat: cStart.lat,
            startLon: cStart.lon,
            endLat: cEnd.lat,
            endLon: cEnd.lon,
            endReason: reason,
            // New port analysis fields
            startPort,
            endPort,
          })
        }

        rows.forEach((row, idx) => {
          const nav = row?.[COL_NAVSTATUS]
          const ts = row?.[COL_TIME]
          if (!nav || !ts) return

          const parts = parseTimestampParts(ts)
          if (!parts) return

          // Detect temporal gap if not the first row (copied from csvToJson.js)
          if (prevTimestamp && hasTimeGap(prevTimestamp, ts)) {
            // Close current interval due to temporal gap
            if (currentStatus !== null) {
              const prevRow = rows[idx - 1]
              const prevTs = prevRow?.[COL_TIME]
              const prevParts = parseTimestampParts(prevTs)
              if (prevParts) {
                createInterval(idx, prevTs, prevParts, "time_gap")
              }
            }
            // Start new interval after gap
            currentStatus = nav
            startTime = parts.time
            startDate = parts.date
            startRawTs = parts.raw
            startIndex = idx
            prevTimestamp = ts
            return
          }

          if (currentStatus === null) {
            currentStatus = nav
            startTime = parts.time
            startDate = parts.date
            startRawTs = parts.raw
            startIndex = idx
            prevTimestamp = ts
            return
          }

          if (nav !== currentStatus) {
            // Close current interval due to status change
            createInterval(idx, ts, parts, "status_change")

            currentStatus = nav
            startTime = parts.time
            startDate = parts.date
            startRawTs = parts.raw
            startIndex = idx
          }

          prevTimestamp = ts
        })

        // Close the last interval
        if (rows.length > 0 && currentStatus != null) {
          const last = rows[rows.length - 1]
          const lastTs = last?.[COL_TIME]
          const lastParts = parseTimestampParts(lastTs)
          if (lastParts) {
            createInterval(rows.length, lastTs, lastParts, "end_of_data")
          }
        }

        return intervals
      }

      const intervals = computeNavigationIntervals(combined)

      return {
        success: true,
        data: {
          intervals,
          summary: {
            totalIntervals: intervals.length,
            totalRows: combined.length,
            filesProcessed: processedFiles.length,
            navigationIntervals: intervals.filter((i) => i.navStatus === "1.0").length,
            anchoredIntervals: intervals.filter((i) => i.navStatus === "0.0").length,
          },
        },
        meta: { processedFiles, errors },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }

  const processFiles = async (files: File[], delimiter: string = ",") => {
    if (files.length === 0) return

    setIsProcessing(true)
    setResults(null)

    try {
      // Read all files as text
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const text = await file.text()
          return { name: file.name, content: text }
        }),
      )

      // Process the CSV data
      const processedResult = await processCSVData(fileContents, delimiter)
      setResults(processedResult)
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al procesar archivos",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const clearResults = () => {
    setResults(null)
  }

  // Nueva función para obtener datos crudos línea por línea
  const getRawDataAsJSON = async (
    files: File[],
    delimiter: string = ","
  ): Promise<RawDataResult> => {
    try {
      const COL_LAT = "00-lathr [deg]"
      const COL_LON = "01-lonhr [deg]"
      const COL_SPEED = "04-speed [knots]"
      const COL_NAVSTATUS = "06-navstatus [adim]"
      const COL_TIME = "time"

      // Port coordinates
      const ports = [
        { name: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
        { name: "Tanger Med", lat: 35.880312709, lon: -5.515627045 },
        { name: "Ceuta", lat: 35.889, lon: -5.307 }
      ]

      // Function to calculate distance between two points (Haversine)
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371 // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180)
        const dLon = (lon2 - lon1) * (Math.PI / 180)
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return Math.round(R * c * 100) / 100
      }

      // Function to find closest port
      const findClosestPort = (lat: number | null, lon: number | null): PortAnalysis | undefined => {
        if (lat === null || lon === null) return undefined
        
        const distances = ports.map(port => ({
          name: port.name,
          distance: calculateDistance(lat, lon, port.lat, port.lon)
        }))
        
        distances.sort((a, b) => a.distance - b.distance)
        return distances[0]
      }

      const csvTextToRows = (csvString: string) => {
        if (!csvString || csvString.trim().length === 0) return []
        const lines = csvString.replace(/\r\n?/g, "\n").trim().split("\n")
        if (lines.length < 2) return []
        const delim = delimiter === "\\t" || delimiter === "tab" ? "\t" : delimiter
        const headers = lines[0].split(delim).map((h) => h.trim())
        const hasNavstatusHeader = headers.some((h) => h.toLowerCase().includes("navstatus"))
        const hasTimeHeader = headers.some((h) => h.trim() === COL_TIME)
        if (!hasNavstatusHeader || !hasTimeHeader) return []

        return lines.slice(1).map((line) => {
          const values = line.split(delim).map((v) => v.trim())
          const row: any = {}
          headers.forEach((header, idx) => {
            const key = header || `column_${idx}`
            const value = values[idx]
            row[key] = value === "" || value === undefined ? null : value
          })
          return row
        })
      }

      // Read all files
      const fileContents = await Promise.all(
        files.map(async (file) => {
          const text = await file.text()
          return { name: file.name, content: text }
        })
      )

      // Process all files
      let combined: any[] = []
      let filesProcessed = 0

      for (const { content } of fileContents) {
        const rows = csvTextToRows(content)
        if (rows.length > 0) {
          combined = combined.concat(rows)
          filesProcessed++
        }
      }

      if (combined.length === 0) {
        return {
          success: false,
          error: "No se pudieron leer filas válidas de los archivos CSV"
        }
      }

      // Transform to structured raw data
      const rawData: RawDataRow[] = combined.map((row) => {
        const timestamp = row[COL_TIME] || ""
        const parts = timestamp.split(" ")
        const date = parts[0] || ""
        const time = parts[1] || ""
        
        const lat = row[COL_LAT] ? Number.parseFloat(row[COL_LAT]) : null
        const lon = row[COL_LON] ? Number.parseFloat(row[COL_LON]) : null
        const latitude = lat !== null && !Number.isNaN(lat) ? lat : null
        const longitude = lon !== null && !Number.isNaN(lon) ? lon : null
        
        const spd = row[COL_SPEED] ? Number.parseFloat(row[COL_SPEED]) : null
        const speed = spd !== null && !Number.isNaN(spd) && spd >= 0 ? spd : null
        
        const closestPort = findClosestPort(latitude, longitude)

        return {
          timestamp,
          date,
          time,
          latitude,
          longitude,
          speed,
          navStatus: row[COL_NAVSTATUS] || "",
          closestPort,
          ...row // Incluir todas las columnas originales
        }
      })

      return {
        success: true,
        data: rawData,
        meta: {
          totalRows: rawData.length,
          filesProcessed
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al procesar archivos"
      }
    }
  }

  return {
    results,
    isProcessing,
    processFiles,
    clearResults,
    processCSVData, // Exposed for direct use if needed
    getRawDataAsJSON, // Nueva función para obtener datos crudos
  }
}
