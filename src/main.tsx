import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './globals.css'
import { ThemeProvider } from './contexts/theme-provider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="cleanmymac-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>
)