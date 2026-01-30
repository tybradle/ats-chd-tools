import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Load Inter variable font for offline-safe typography
// import the package entry which provides variable font CSS
import "@fontsource-variable/inter/index.css"
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/error-boundary'
import { ThemeProvider } from '@/components/theme-provider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
)
