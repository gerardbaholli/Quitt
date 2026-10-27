import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/roboto-mono/latin-300.css'
import '@fontsource/roboto-mono/latin-400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
