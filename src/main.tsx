import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import 'dayjs/locale/nb'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import './index.css'
import { erPublicSti } from './public/sti'

// Den offentlige nettsiden lastes separat, uten Firebase og uten innlogging.
const App = lazy(() => import('./App.tsx'))
const PublicSite = lazy(() => import('./public/PublicSite'))
const erPublic = erPublicSti(window.location.pathname)

const theme = createTheme({
  primaryColor: 'dark',
  fontFamily: 'var(--font-sans), sans-serif',
  defaultRadius: 'md',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: 'nb' }}>
        <Suspense fallback={null}>{erPublic ? <PublicSite /> : <App />}</Suspense>
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
