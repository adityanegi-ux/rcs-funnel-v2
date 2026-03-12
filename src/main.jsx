import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppV2 from './AppV2.jsx'
import { enableAnalytics } from './services/analytics'

enableAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppV2 />
  </StrictMode>,
)
