import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { type Database, getDatabase } from 'firebase/database'

let _app: FirebaseApp | null = null
let _db: Database | null = null

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        })
  }
  return _app
}

export function getDb(): Database {
  if (!_db) _db = getDatabase(getApp())
  return _db
}
