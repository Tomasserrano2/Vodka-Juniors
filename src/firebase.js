import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAI1tfjgtlLqfVEfSnyhUYWIEcz_yjlTCE",
  authDomain: "vodka-juniors.firebaseapp.com",
  projectId: "vodka-juniors",
  storageBucket: "vodka-juniors.firebasestorage.app",
  messagingSenderId: "836406435815",
  appId: "1:836406435815:web:0b10e00b5cc635a8d82742",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
