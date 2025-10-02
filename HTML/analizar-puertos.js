// analizar-puertos.js
// Función simple para analizar posiciones de barco y puertos más cercanos

/**
 * Analiza todos los intervalos del JSON GPS y determina puertos más cercanos
 * @param {Object} gpsData - Datos del JSON resultado-gps.json
 * @returns {Array} Array con análisis de cada intervalo
 */
export function analizarPuertosGPS(gpsData) {
  // Coordenadas de los puertos
  const puertos = [
    { nombre: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
    { nombre: "Tánger Med", lat: 35.880312709, lon: -5.515627045 },
    { nombre: "Ceuta", lat: 35.889, lon: -5.307 }
  ];

  // Función para calcular distancia entre dos puntos
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  // Función para encontrar puerto más cercano
  function encontrarPuertoMasCercano(lat, lon) {
    const distancias = puertos.map(puerto => ({
      nombre: puerto.nombre,
      distancia: calcularDistancia(lat, lon, puerto.lat, puerto.lon)
    }));
    
    distancias.sort((a, b) => a.distancia - b.distancia);
    return distancias[0];
  }

  // Analizar todos los intervalos
  const resultados = [];
  
  gpsData.data.intervals.forEach((intervalo, index) => {
    // Encontrar puerto más cercano al inicio
    const puertoInicio = encontrarPuertoMasCercano(intervalo.startLat, intervalo.startLon);
    
    // Encontrar puerto más cercano al final
    const puertoFinal = encontrarPuertoMasCercano(intervalo.endLat, intervalo.endLon);
    
    // Crear resultado
    const resultado = {
      numeroIntervalo: index + 1,
      fecha: intervalo.startDate,
      horaInicio: intervalo.startTime,
      horaFinal: intervalo.endTime,
      duracion: intervalo.duration,
      navStatus: intervalo.navStatus,
      velocidad: intervalo.avgSpeed,
      
      // Posición de inicio
      posicionInicio: {
        lat: intervalo.startLat,
        lon: intervalo.startLon,
        puertoMasCercano: puertoInicio.nombre,
        distanciaPuerto: puertoInicio.distancia
      },
      
      // Posición final
      posicionFinal: {
        lat: intervalo.endLat,
        lon: intervalo.endLon,
        puertoMasCercano: puertoFinal.nombre,
        distanciaPuerto: puertoFinal.distancia
      }
    };
    
    resultados.push(resultado);
  });
  
  return resultados;
}

// Función para mostrar resultados en consola
export function mostrarResultados(resultados) {
  console.log('🚢 ANÁLISIS DE PUERTOS MÁS CERCANOS');
  console.log('='.repeat(80));
  
  resultados.forEach(item => {
    console.log(`\nIntervalo ${item.numeroIntervalo} | ${item.fecha} | ${item.horaInicio} → ${item.horaFinal}`);
    console.log(`Estado: ${item.navStatus} | Velocidad: ${item.velocidad} nudos | Duración: ${item.duracion}`);
    console.log(`📍 INICIO: Puerto más cercano → ${item.posicionInicio.puertoMasCercano} (${item.posicionInicio.distanciaPuerto} km)`);
    console.log(`📍 FINAL:  Puerto más cercano → ${item.posicionFinal.puertoMasCercano} (${item.posicionFinal.distanciaPuerto} km)`);
  });
}

// Ejemplo de uso
if (import.meta.url === `file://${process.argv[1]}`) {
  import fs from 'fs';
  
  try {
    const gpsData = JSON.parse(fs.readFileSync('resultado-gps.json', 'utf8'));
    const resultados = analizarPuertosGPS(gpsData);
    mostrarResultados(resultados);
    
    console.log(`\n✅ Análisis completado: ${resultados.length} intervalos procesados`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}
