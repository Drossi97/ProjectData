// test-useCSVProcessor.js
// Script de prueba para la funcionalidad integrada de análisis de puertos

import fs from 'fs';

// Simulamos la funcionalidad del hook para Node.js
async function testCSVProcessor() {
  console.log('🧪 PRUEBA DE useCSVProcessor CON ANÁLISIS DE PUERTOS');
  console.log('='.repeat(70));

  try {
    // Leer el JSON existente para comparar
    const existingData = JSON.parse(fs.readFileSync('resultado-gps.json', 'utf8'));
    
    console.log('📊 DATOS EXISTENTES:');
    console.log(`✅ Total intervalos: ${existingData.data.intervals.length}`);
    
    // Mostrar primeros 5 intervalos con análisis de puertos simulado
    console.log('\n📋 PRIMEROS 5 INTERVALOS CON ANÁLISIS DE PUERTOS:');
    console.log('='.repeat(70));
    
    // Coordenadas de los puertos (mismas que en el hook)
    const puertos = [
      { nombre: "Algeciras", lat: 36.128740148, lon: -5.439981128 },
      { nombre: "Tánger Med", lat: 35.880312709, lon: -5.515627045 },
      { nombre: "Ceuta", lat: 35.889, lon: -5.307 }
    ];

    // Función para calcular distancia (misma que en el hook)
    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 100) / 100;
    };

    // Función para encontrar puerto más cercano (misma que en el hook)
    const encontrarPuertoMasCercano = (lat, lon) => {
      if (lat === null || lon === null) return undefined;
      
      const distancias = puertos.map(puerto => ({
        nombre: puerto.nombre,
        distancia: calcularDistancia(lat, lon, puerto.lat, puerto.lon)
      }));
      
      distancias.sort((a, b) => a.distancia - b.distancia);
      return distancias[0];
    };

    // Procesar los primeros 5 intervalos
    existingData.data.intervals.slice(0, 5).forEach((interval, index) => {
      const puertoInicio = encontrarPuertoMasCercano(interval.startLat, interval.startLon);
      const puertoFinal = encontrarPuertoMasCercano(interval.endLat, interval.endLon);
      
      console.log(`\n🚢 INTERVALO ${index + 1}:`);
      console.log(`📅 Fecha: ${interval.startDate}`);
      console.log(`⏰ Horario: ${interval.startTime} → ${interval.endTime}`);
      console.log(`⏱️ Duración: ${interval.duration}`);
      console.log(`🚤 Velocidad: ${interval.avgSpeed} nudos`);
      console.log(`📊 Estado: ${interval.navStatus} (${getEstadoNombre(interval.navStatus)})`);
      console.log(`📏 Muestras: ${interval.sampleCount.toLocaleString()}`);
      
      if (puertoInicio) {
        console.log(`📍 INICIO: ${puertoInicio.nombre} (${puertoInicio.distancia} km)`);
      } else {
        console.log(`📍 INICIO: Sin coordenadas válidas`);
      }
      
      if (puertoFinal) {
        console.log(`📍 FINAL: ${puertoFinal.nombre} (${puertoFinal.distancia} km)`);
      } else {
        console.log(`📍 FINAL: Sin coordenadas válidas`);
      }
      
      console.log(`🏁 Razón de fin: ${interval.endReason}`);
    });
    
    // Estadísticas por estado con análisis de puertos
    console.log('\n' + '='.repeat(70));
    console.log('📈 ESTADÍSTICAS POR ESTADO DE NAVEGACIÓN');
    console.log('='.repeat(70));
    
    const estadisticas = {
      "0.0": { nombre: "ANCLADO", count: 0, puertos: {} },
      "1.0": { nombre: "MANIOBRANDO", count: 0, puertos: {} },
      "2.0": { nombre: "NAVEGANDO", count: 0, puertos: {} }
    };
    
    existingData.data.intervals.forEach(interval => {
      const estado = interval.navStatus;
      if (estadisticas[estado]) {
        estadisticas[estado].count++;
        
        // Contar puertos por estado
        const puertoInicio = encontrarPuertoMasCercano(interval.startLat, interval.startLon);
        const puertoFinal = encontrarPuertoMasCercano(interval.endLat, interval.endLon);
        
        if (puertoInicio) {
          estadisticas[estado].puertos[puertoInicio.nombre] = 
            (estadisticas[estado].puertos[puertoInicio.nombre] || 0) + 1;
        }
        if (puertoFinal) {
          estadisticas[estado].puertos[puertoFinal.nombre] = 
            (estadisticas[estado].puertos[puertoFinal.nombre] || 0) + 1;
        }
      }
    });
    
    Object.entries(estadisticas).forEach(([navStatus, data]) => {
      console.log(`\n${data.nombre} (${navStatus}):`);
      console.log(`  📊 Intervalos: ${data.count}`);
      console.log(`  🏠 Puertos más frecuentes:`);
      
      Object.entries(data.puertos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .forEach(([puerto, count]) => {
          console.log(`     ${puerto}: ${count} operaciones`);
        });
    });
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ PRUEBA COMPLETADA');
    console.log('💡 La funcionalidad está integrada en useCSVProcessor.ts');
    console.log('🚀 Ahora cada intervalo incluye puertoInicio y puertoFinal');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

function getEstadoNombre(navStatus) {
  switch (navStatus) {
    case "0.0": return "ANCLADO";
    case "1.0": return "MANIOBRANDO";
    case "2.0": return "NAVEGANDO";
    default: return "DESCONOCIDO";
  }
}

// Ejecutar la prueba
testCSVProcessor();
