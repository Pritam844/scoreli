import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBaqfJY61DzZ0Gd6F6ZZiAWHNJr1D9iq7w",
  authDomain: "scoreli-e5f98.firebaseapp.com",
  databaseURL: "https://scoreli-e5f98-default-rtdb.firebaseio.com",
  projectId: "scoreli-e5f98",
  storageBucket: "scoreli-e5f98.firebasestorage.app",
  messagingSenderId: "898947951152",
  appId: "1:898947951152:web:687fc1cb410daee1301bf5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
