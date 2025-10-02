// port-distance-calculator.js
// Función para calcular distancias a puertos y determinar el más cercano

// Coordenadas fijas de los puertos (corregidas)
const PORTS = [
  { name: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
  { name: "Tánger Med", lat: 35.880312709, lon: -5.515627045 },
  { name: "Ceuta", lat: 35.889, lon: -5.307 }  // Coordenadas corregidas de Ceuta
];

/**
 * Calcula la distancia entre dos puntos usando la fórmula de Haversine
 * @param {number} lat1 Latitud del primer punto
 * @param {number} lon1 Longitud del primer punto
 * @param {number} lat2 Latitud del segundo punto
 * @param {number} lon2 Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Redondear a 2 decimales
}

/**
 * Convierte grados a radianes
 * @param {number} degrees Grados a convertir
 * @returns {number} Radianes
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Encuentra el puerto más cercano a unas coordenadas dadas
 * @param {number} lat Latitud del punto de referencia
 * @param {number} lon Longitud del punto de referencia
 * @returns {Object} Resultado con el puerto más cercano y todas las distancias
 */
export function findClosestPort(lat, lon) {
  const distances = PORTS.map(port => ({
    port: port.name,
    distance: calculateHaversineDistance(lat, lon, port.lat, port.lon)
  }));
  
  // Ordenar por distancia para encontrar el más cercano
  distances.sort((a, b) => a.distance - b.distance);
  
  return {
    closestPort: distances[0].port,
    distance: distances[0].distance,
    allDistances: distances
  };
}

/**
 * Analiza una ruta completa (punto de inicio y punto final)
 * @param {number} startLat Latitud del punto de inicio
 * @param {number} startLon Longitud del punto de inicio
 * @param {number} endLat Latitud del punto final
 * @param {number} endLon Longitud del punto final
 * @returns {Object} Análisis completo de la ruta con puertos más cercanos
 */
export function analyzeRoute(startLat, startLon, endLat, endLon) {
  const startPort = findClosestPort(startLat, startLon);
  const endPort = findClosestPort(endLat, endLon);
  
  console.log(`🚢 ANÁLISIS DE RUTA:`);
  console.log(`📍 Puerto más cercano al INICIO: ${startPort.closestPort} (${startPort.distance} km)`);
  console.log(`📍 Puerto más cercano al FINAL: ${endPort.closestPort} (${endPort.distance} km)`);
  
  return {
    startPort,
    endPort
  };
}

/**
 * Función auxiliar para mostrar detalles completos de distancias
 * @param {number} lat Latitud del punto
 * @param {number} lon Longitud del punto
 * @param {string} label Etiqueta descriptiva del punto
 */
export function showPortDistances(lat, lon, label = "Punto") {
  const result = findClosestPort(lat, lon);
  
  console.log(`\n🌊 ${label} (${lat}, ${lon}):`);
  console.log(`✅ Puerto más cercano: ${result.closestPort} (${result.distance} km)`);
  console.log(`📊 Todas las distancias:`);
  
  result.allDistances.forEach((item, index) => {
    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    console.log(`   ${emoji} ${item.port}: ${item.distance} km`);
  });
}

/**
 * Procesa un intervalo del JSON de GPS y analiza sus puertos
 * @param {Object} interval Intervalo del JSON resultado-gps.json
 * @returns {Object} Análisis de ruta del intervalo
 */
export function analyzeGPSInterval(interval) {
  return analyzeRoute(
    interval.startLat,
    interval.startLon,
    interval.endLat,
    interval.endLon
  );
}

/**
 * Procesa todos los intervalos de navegación (navStatus = "2.0") del JSON
 * @param {Object} gpsData Datos del JSON resultado-gps.json
 * @returns {Array} Array con análisis de cada intervalo de navegación
 */
export function analyzeAllNavigationIntervals(gpsData) {
  if (!gpsData.success || !gpsData.data?.intervals) {
    throw new Error('Datos GPS inválidos');
  }
  
  const navigationIntervals = gpsData.data.intervals.filter(
    interval => interval.navStatus === "2.0"
  );
  
  console.log(`🚢 Analizando ${navigationIntervals.length} intervalos de navegación...\n`);
  
  return navigationIntervals.map((interval, index) => {
    console.log(`--- Intervalo ${index + 1} ---`);
    console.log(`⏰ ${interval.startDate} ${interval.startTime} → ${interval.endDate} ${interval.endTime}`);
    console.log(`🚤 Velocidad promedio: ${interval.avgSpeed} nudos`);
    
    const analysis = analyzeGPSInterval(interval);
    console.log('');
    
    return analysis;
  });
}
