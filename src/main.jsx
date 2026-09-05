// Punto de entrada React; selecciona la vista operativa o la página explicativa según la ruta.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ProjectPage from './ProjectPage.jsx'

const isProjectPage = ['/proyecto', '/proyecto/'].includes(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isProjectPage ? <ProjectPage /> : <App />}
  </StrictMode>,
)
