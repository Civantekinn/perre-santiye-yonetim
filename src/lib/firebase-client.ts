"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const STORAGE_KEY = "perre_firebase_web_config";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

export function firebaseConfigKaydet(cfg: FirebaseWebConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function firebaseConfigOku(): FirebaseWebConfig | null {
  if (typeof window === "undefined") return null;
  const fromEnv =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      ? ({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        } as FirebaseWebConfig)
      : null;
  if (fromEnv) return fromEnv;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FirebaseWebConfig;
  } catch {
    return null;
  }
}

let app: FirebaseApp | null = null;

export function getFirebaseClientApp(): FirebaseApp | null {
  const cfg = firebaseConfigOku();
  if (!cfg?.apiKey) return null;
  if (app) return app;
  app = getApps().length
    ? getApps()[0]!
    : initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      });
  return app;
}

export function getFirebaseAuth() {
  const a = getFirebaseClientApp();
  return a ? getAuth(a) : null;
}

export async function firebaseGiris(email: string, sifre: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase yapılandırılmamış");
  return signInWithEmailAndPassword(auth, email, sifre);
}

export async function firebaseKayit(email: string, sifre: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase yapılandırılmamış");
  return createUserWithEmailAndPassword(auth, email, sifre);
}

export async function firebaseCikis() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await signOut(auth);
}

export function firebaseOturumDinle(cb: (u: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
