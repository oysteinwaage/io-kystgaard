import { Button } from '@/components/ui/button'
import styles from './App.module.scss'

function App() {
  return (
    <main className={styles.page}>
      <h1 className="text-5xl font-semibold">Hello World</h1>
      <p className={styles.subtitle}>Io Kystgaard</p>
      <Button>Hello World</Button>
    </main>
  )
}

export default App
