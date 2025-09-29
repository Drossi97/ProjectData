/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Suprimir warnings y errores del navegador
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error']
    } : false,
  },
  // Deshabilitar React Strict Mode para reducir warnings
  reactStrictMode: false,
  // Configuración experimental para reducir warnings
  experimental: {
    // Deshabilitar algunos warnings de desarrollo
    esmExternals: false,
  },
  // Configuración para webpack
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Suprimir warnings específicos en desarrollo
      config.infrastructureLogging = {
        level: 'error',
      }
    }
    return config
  },
}

export default nextConfig
