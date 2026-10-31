import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Font đóng gói cùng app: mạng yếu vẫn hiện ngay, không phụ thuộc máy chủ ngoài
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import '@fontsource/be-vietnam-pro/latin-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-900.css'
import '@fontsource/be-vietnam-pro/latin-900.css'
import './index.css'
import App from './App'

registerSW({ immediate: true })

const AdminPage = lazy(() => import('./components/AdminPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.hash === '#duyet' ? (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
