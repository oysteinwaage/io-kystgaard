import { GoogleAuthProvider } from 'firebase/auth'
import { getDatabase, ref } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { app, auth } from './firebaseApp'

export { app, auth }
export const db = getDatabase(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()

/**
 * This app shares its Firebase project with other apps. All data belonging
 * to Io Kystgård lives under this root in the Realtime Database.
 */
export const APP_ROOT = 'ioKystgaard'

/** Builds a database reference scoped to this app's root node. */
export function appRef(path?: string) {
  return ref(db, path ? `${APP_ROOT}/${path}` : APP_ROOT)
}
