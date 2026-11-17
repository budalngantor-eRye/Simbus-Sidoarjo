import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

export const FIREBASE_DATABASE_URL =
  'https://simbus-disdikbud-sidoarjo-default-rtdb.asia-southeast1.firebasedatabase.app';

const firebaseConfig = {
  apiKey: 'AIzaSyBk9_dYbDVEgJE8JqGKBxE2gK23uS_OfRs',
  authDomain: 'simbus-disdikbud-sidoarjo.firebaseapp.com',
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: 'simbus-disdikbud-sidoarjo',
  storageBucket: 'simbus-disdikbud-sidoarjo.firebasestorage.app',
  messagingSenderId: '319952218574',
  appId: '1:319952218574:web:da30a2cdc70dd69f6ce39f',
  measurementId: 'G-H18P8808F9',
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
