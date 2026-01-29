import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDDSIqcSHxVGN4OP5WBdPK_M28hQh5olu0",
  authDomain: "a-very-terry-game.firebaseapp.com",
  databaseURL: "https://a-very-terry-game-default-rtdb.firebaseio.com",
  projectId: "a-very-terry-game",
  storageBucket: "a-very-terry-game.firebasestorage.app",
  messagingSenderId: "799377272376",
  appId: "1:799377272376:web:227b7537c7c1d24691c0cd",
  measurementId: "G-05JESVKE9L"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export default app;
