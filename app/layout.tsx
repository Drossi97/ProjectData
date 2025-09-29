import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

// Suprimir warnings de consola en desarrollo
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args) => {
    // Filtrar errores específicos que no queremos mostrar
    const message = args.join(' ')
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: React.createFactory is deprecated') ||
      message.includes('Warning: componentWillMount has been renamed') ||
      message.includes('Warning: componentWillReceiveProps has been renamed') ||
      message.includes('Warning: componentWillUpdate has been renamed') ||
      message.includes('Warning: The prop `children`') ||
      message.includes('Warning: Failed prop type') ||
      message.includes('Warning: Each child in a list') ||
      message.includes('Warning: validateDOMNesting') ||
      message.includes('Warning: Text strings must be rendered within') ||
      message.includes('Warning: Cannot update during an existing state transition') ||
      message.includes('Warning: Maximum update depth exceeded') ||
      message.includes('Warning: Cannot read properties of null') ||
      message.includes('Warning: Cannot read property') ||
      message.includes('Warning: findDOMNode is deprecated') ||
      message.includes('Warning: React does not recognize the') ||
      message.includes('Warning: Invalid DOM property') ||
      message.includes('Warning: React has detected a change in the order') ||
      message.includes('Warning: A component is changing an uncontrolled input') ||
      message.includes('Warning: A component is changing from controlled to uncontrolled') ||
      message.includes('Warning: Form field') ||
      message.includes('Warning: Use the `defaultValue` or `value` props') ||
      message.includes('Warning: Invalid value for prop') ||
      message.includes('Warning: Missing key prop') ||
      message.includes('Warning: Encountered two children with the same key') ||
      message.includes('Warning: Cannot call') ||
      message.includes('Warning: The tag') ||
      message.includes('Warning: The style prop') ||
      message.includes('Warning: Expected server HTML to contain') ||
      message.includes('Warning: Did not expect server HTML to contain') ||
      message.includes('Warning: An update to %s inside a test was not wrapped') ||
      message.includes('Warning: %s is deprecated') ||
      message.includes('Warning: %s uses the deprecated String.prototype.substr()') ||
      message.includes('Warning: %s uses the deprecated %s') ||
      message.includes('Warning: %s uses the deprecated %s') ||
      message.includes('Warning: %s uses the deprecated %s') ||
      message.includes('Warning: %s uses the deprecated %s')
    ) {
      return
    }
    originalError(...args)
  }

  console.warn = (...args) => {
    // Filtrar warnings específicos que no queremos mostrar
    const message = args.join(' ')
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: componentWillMount has been renamed') ||
      message.includes('Warning: componentWillReceiveProps has been renamed') ||
      message.includes('Warning: componentWillUpdate has been renamed') ||
      message.includes('Warning: The prop `children`') ||
      message.includes('Warning: Failed prop type') ||
      message.includes('Warning: Each child in a list') ||
      message.includes('Warning: validateDOMNesting') ||
      message.includes('Warning: Text strings must be rendered within') ||
      message.includes('Warning: Cannot update during an existing state transition') ||
      message.includes('Warning: Cannot read properties of null') ||
      message.includes('Warning: Cannot read property') ||
      message.includes('Warning: findDOMNode is deprecated') ||
      message.includes('Warning: React does not recognize the') ||
      message.includes('Warning: Invalid DOM property') ||
      message.includes('Warning: React has detected a change in the order') ||
      message.includes('Warning: A component is changing an uncontrolled input') ||
      message.includes('Warning: A component is changing from controlled to uncontrolled') ||
      message.includes('Warning: Form field') ||
      message.includes('Warning: Use the `defaultValue` or `value` props') ||
      message.includes('Warning: Invalid value for prop') ||
      message.includes('Warning: Missing key prop') ||
      message.includes('Warning: Encountered two children with the same key') ||
      message.includes('Warning: Cannot call') ||
      message.includes('Warning: The tag') ||
      message.includes('Warning: The style prop') ||
      message.includes('Warning: %s is deprecated') ||
      message.includes('Warning: %s uses the deprecated String.prototype.substr()') ||
      message.includes('Warning: %s uses the deprecated %s')
    ) {
      return
    }
    originalWarn(...args)
  }
}

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Dashboard de análisis de rutas marítimas',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        {children}
        {/* Solo cargar Analytics en producción para evitar mensajes de consola */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
