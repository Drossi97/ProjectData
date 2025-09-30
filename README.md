# Dashboard Project

Dashboard interactivo para análisis de datos de navegación marítima mediante archivos CSV.

## 📋 Descripción

Este proyecto es una aplicación web desarrollada con Next.js que permite cargar, procesar y visualizar datos de navegación marítima a través de archivos CSV. Ofrece análisis detallados de rutas, actividades portuarias y estadísticas de navegación mediante gráficos interactivos.

## ✨ Características

- **Carga de archivos CSV**: Sistema de drag & drop para cargar múltiples archivos CSV
- **Análisis de navegación**: Visualización de rutas completas entre puertos
- **Gráficos interactivos**: Gráficos de líneas y de tarta para análisis visual
- **Estadísticas detalladas**: Análisis por trayectos y actividades portuarias
- **Interfaz responsiva**: Diseño adaptable a diferentes dispositivos
- **Tema oscuro**: Interfaz moderna con paleta de colores oscura

## 🚀 Tecnologías

- **[Next.js 14](https://nextjs.org/)** - Framework de React
- **[React 18](https://react.dev/)** - Biblioteca de UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework de CSS
- **[Recharts](https://recharts.org/)** - Biblioteca de gráficos
- **[Radix UI](https://www.radix-ui.com/)** - Componentes de UI accesibles
- **[Lucide React](https://lucide.dev/)** - Iconos

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/Drossi97/Dashboard-Project.git
cd Dashboard-Project
```

2. Instala las dependencias:
```bash
npm install
# o
pnpm install
# o
yarn install
```

3. Ejecuta el servidor de desarrollo:
```bash
npm run dev
# o
pnpm dev
# o
yarn dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🎯 Uso

1. **Cargar archivos CSV**: Arrastra y suelta archivos CSV en la zona de carga o haz clic para seleccionarlos
2. **Procesar datos**: Haz clic en "Procesar Datos" para analizar los archivos
3. **Visualizar**: Explora los diferentes paneles de análisis:
   - **Gráfico de líneas**: Visualiza datos temporales con zoom interactivo
   - **Estadísticas de navegación completa**: Análisis global de todas las actividades
   - **Estadísticas por trayectos**: Análisis detallado de cada ruta individual

## 📝 Formato de archivos CSV

Los archivos CSV deben contener las siguientes columnas:
- Información de fecha y hora
- Coordenadas de ubicación (latitud, longitud)
- Estado de navegación
- Información de puertos
- Velocidad y duración

## 🏗️ Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera el build de producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter

## 📄 Licencias de Terceros

Este proyecto utiliza las siguientes bibliotecas de código abierto:

### Recharts

Este proyecto utiliza [Recharts](https://recharts.org/), una biblioteca de gráficos construida con React y D3.

**The MIT License (MIT)**

Copyright (c) 2015-2024 Recharts Group

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Otras bibliotecas

Este proyecto también utiliza otras bibliotecas de código abierto bajo licencia MIT:
- Next.js (Copyright © Vercel, Inc.)
- React (Copyright © Meta Platforms, Inc.)
- Tailwind CSS (Copyright © Tailwind Labs, Inc.)
- Radix UI (Copyright © WorkOS)
- Lucide Icons (Copyright © Lucide Contributors)

Todas las licencias completas se pueden encontrar en sus respectivos paquetes en `node_modules`.

## 👨‍💻 Autor

**David**

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## ⚠️ Estado del Proyecto

Este proyecto está en fase de desarrollo activo. Algunas características pueden estar en pruebas o sujetas a cambios.

## 📧 Contacto

Para preguntas o sugerencias, por favor abre un issue en el repositorio.

---

**Nota**: Este es un proyecto de análisis de datos de navegación marítima. Los datos procesados son confidenciales y no deben ser compartidos sin autorización.
