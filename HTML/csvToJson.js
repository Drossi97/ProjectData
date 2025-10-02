const fs = require('fs');

/**
 * Procesa archivos CSV de datos GPS y devuelve un JSON con los intervalos de navegación
 * @param {string[]} filePaths - Array de rutas a los archivos CSV
 * @param {string} delimiter - Delimitador del CSV (por defecto ',')
 * @returns {string} JSON string con los resultados del análisis
 */
function csvToJson(filePaths, delimiter = ',') {
  try {
    // Constantes para las columnas
    const COL_LAT = "00-lathr [deg]";
    const COL_LON = "01-lonhr [deg]";
    const COL_SPEED = "04-speed [knots]";
    const COL_NAVSTATUS = "06-navstatus [adim]";
    const COL_TIME = "time";

    // Función para parsear timestamp
    function parseTimestampParts(timestamp) {
      if (!timestamp || typeof timestamp !== "string") return null;
      const parts = timestamp.split(" ");
      if (parts.length < 2) return null;
      return { date: parts[0], time: parts[1], raw: timestamp };
    }

    // Función para calcular diferencia de tiempo
    function diffHms(startTime, endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "00:00:00";
      if (end < start) end.setDate(end.getDate() + 1);
      const seconds = Math.floor((end - start) / 1000);
      const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
      const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      return `${hh}:${mm}:${ss}`;
    }

    // Función para calcular diferencia en segundos entre dos timestamps completos
    function getTimeDifferenceInSeconds(timestamp1, timestamp2) {
      try {
        const date1 = new Date(timestamp1);
        const date2 = new Date(timestamp2);
        if (Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) return null;
        return Math.abs((date2 - date1) / 1000);
      } catch (error) {
        return null;
      }
    }

    // Función para detectar gap temporal (mayor a 0.5 segundos)
    function hasTimeGap(prevTimestamp, currentTimestamp, maxGapSeconds = 0.6) {
      const diffSeconds = getTimeDifferenceInSeconds(prevTimestamp, currentTimestamp);
      return diffSeconds !== null && diffSeconds > maxGapSeconds;
    }

    // Función para obtener coordenadas
    function getCoords(row) {
      if (!row) return { lat: null, lon: null };
      const lat = Number.parseFloat(row[COL_LAT]);
      const lon = Number.parseFloat(row[COL_LON]);
      return {
        lat: Number.isNaN(lat) ? null : lat,
        lon: Number.isNaN(lon) ? null : lon,
      };
    }

    // Función para calcular velocidad promedio
    function averageSpeed(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const speeds = rows
        .map(r => {
          const v = r?.[COL_SPEED];
          const n = v === "" || v == null ? Number.NaN : Number.parseFloat(v);
          return Number.isNaN(n) || n < 0 ? null : n;
        })
        .filter(n => n != null);
      if (speeds.length === 0) return null;
      const sum = speeds.reduce((a, b) => a + b, 0);
      return Math.round((sum / speeds.length) * 100) / 100;
    }

    // Función para convertir CSV a filas
    function csvTextToRows(csvString) {
      if (!csvString || csvString.trim().length === 0) return [];
      const lines = csvString.replace(/\r\n?/g, "\n").trim().split("\n");
      if (lines.length < 2) return [];
      const delim = delimiter === "\\t" || delimiter === "tab" ? "\t" : delimiter;
      const headers = lines[0].split(delim).map(h => h.trim());
      const hasNavstatusHeader = headers.some(h => h.toLowerCase().includes("navstatus"));
      const hasTimeHeader = headers.some(h => h.trim() === COL_TIME);
      if (!hasNavstatusHeader || !hasTimeHeader) return [];
      
      return lines.slice(1).map((line) => {
        const values = line.split(delim).map(v => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
          const key = header || `column_${idx}`;
          const value = values[idx];
          row[key] = (value === "" || value === undefined) ? null : value;
        });
        return row;
      });
    }

    // Función para ordenar intervalos
    function sortIntervalsByStart(intervals) {
      return [...intervals].sort((a, b) => {
        try {
          // Crear timestamps completos con fecha y hora
          const dateTimeA = `${a.startDate}T${a.startTime}`;
          const dateTimeB = `${b.startDate}T${b.startTime}`;
          
          const timestampA = new Date(dateTimeA);
          const timestampB = new Date(dateTimeB);
          
          // Verificar si las fechas son válidas
          if (isNaN(timestampA.getTime()) || isNaN(timestampB.getTime())) {
            // Fallback: comparación de strings
            return dateTimeA.localeCompare(dateTimeB);
          }
          
          // Comparar timestamps
          const timeDiff = timestampA.getTime() - timestampB.getTime();
          
          // Debug: log para intervalos problemáticos
          if (Math.abs(timeDiff) > 86400000 * 30) { // Más de 30 días de diferencia
            console.log(`Ordenando: ${dateTimeA} vs ${dateTimeB}, diff: ${timeDiff}`);
          }
          
          return timeDiff;
        } catch (error) {
          console.error('Error en ordenamiento:', error);
          const fallbackA = `${a.startDate}T${a.startTime}`;
          const fallbackB = `${b.startDate}T${b.startTime}`;
          return fallbackA.localeCompare(fallbackB);
        }
      });
    }

    // Función principal para calcular intervalos
    function computeNavigationIntervals(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const intervals = [];
      let currentStatus = null;
      let startTime = null, startDate = null, startRawTs = null, startIndex = 0;
      let prevTimestamp = null;

      // Función auxiliar para crear un intervalo
      function createInterval(endIndex, endTimestamp, endParts, reason = "status_change") {
        const prevTime = startRawTs.split(" ")[1];
        const currTime = endTimestamp.split(" ")[1];
        const duration = diffHms(prevTime, currTime);
        const chunk = rows.slice(startIndex, endIndex);
        const avg = averageSpeed(chunk);
        const first = rows[startIndex];
        const last = rows[endIndex - 1];
        const cStart = getCoords(first);
        const cEnd = getCoords(last);

        intervals.push({
          startDate,
          startTime,
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
          endReason: reason // Para debug: "status_change" o "time_gap"
        });
      }

      rows.forEach((row, idx) => {
        const nav = row?.[COL_NAVSTATUS];
        const ts = row?.[COL_TIME];
        if (!nav || !ts) return;

        const parts = parseTimestampParts(ts);
        if (!parts) return;

        // Detectar gap temporal si no es la primera fila
        if (prevTimestamp && hasTimeGap(prevTimestamp, ts)) {
          // Cerrar intervalo actual por gap temporal
          if (currentStatus !== null) {
            const prevRow = rows[idx - 1];
            const prevTs = prevRow?.[COL_TIME];
            const prevParts = parseTimestampParts(prevTs);
            if (prevParts) {
              createInterval(idx, prevTs, prevParts, "time_gap");
            }
          }
          // Iniciar nuevo intervalo después del gap
          currentStatus = nav;
          startTime = parts.time;
          startDate = parts.date;
          startRawTs = parts.raw;
          startIndex = idx;
          prevTimestamp = ts;
          return;
        }

        if (currentStatus === null) {
          currentStatus = nav;
          startTime = parts.time;
          startDate = parts.date;
          startRawTs = parts.raw;
          startIndex = idx;
          prevTimestamp = ts;
          return;
        }

        if (nav !== currentStatus) {
          // Cerrar intervalo actual por cambio de status
          createInterval(idx, ts, parts, "status_change");

          currentStatus = nav;
          startTime = parts.time;
          startDate = parts.date;
          startRawTs = parts.raw;
          startIndex = idx;
        }

        prevTimestamp = ts;
      });

      // Cerrar el último intervalo
      if (rows.length > 0 && currentStatus != null) {
        const last = rows[rows.length - 1];
        const lastTs = last?.[COL_TIME];
        const lastParts = parseTimestampParts(lastTs);
        if (lastParts) {
          createInterval(rows.length, lastTs, lastParts, "end_of_data");
        }
      }
      
      return sortIntervalsByStart(intervals);
    }

    // Procesamiento principal
    let combined = [];
    let processedFiles = [];
    let errors = [];
    
    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          errors.push(`Archivo no encontrado: ${filePath}`);
          continue;
        }
        
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const rows = csvTextToRows(csvContent);
        
        if (rows.length === 0) {
          errors.push(`Archivo sin datos válidos: ${filePath}`);
        } else {
          combined = combined.concat(rows);
          processedFiles.push({
            file: filePath,
            rows: rows.length
          });
        }
      } catch (error) {
        errors.push(`Error leyendo ${filePath}: ${error.message}`);
      }
    }
    
    if (combined.length === 0) {
      return JSON.stringify({
        success: false,
        error: "No se pudieron leer filas válidas",
        processedFiles,
        errors
      }, null, 2);
    }
    
    const intervals = computeNavigationIntervals(combined);
    
    if (intervals.length === 0) {
      return JSON.stringify({
        success: false,
        error: "No se detectaron intervalos de navegación",
        meta: {
          totalRows: combined.length,
          processedFiles
        },
        errors
      }, null, 2);
    }
    
    const result = {
      success: true,
      data: {
        intervals: intervals,
        lastInterval: intervals[intervals.length - 1],
        summary: {
          totalIntervals: intervals.length,
          totalRows: combined.length,
          filesProcessed: processedFiles.length,
          navigationIntervals: intervals.filter(i => i.navStatus === "1.0").length,
          anchoredIntervals: intervals.filter(i => i.navStatus === "0.0").length
        }
      },
      meta: {
        processedFiles,
        errors
      }
    };
    
    return JSON.stringify(result, null, 2);
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }, null, 2);
  }
}

module.exports = { csvToJson };
