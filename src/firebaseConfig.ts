// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDmzh3Md_7u5OhfVitjjKoqr5I95VGJUAc",
  authDomain: "salon-stock-app.firebaseapp.com",
  projectId: "salon-stock-app",
  storageBucket: "salon-stock-app.firebasestorage.app",
  messagingSenderId: "324646673842",
  appId: "1:324646673842:web:49f3650707d19ce41e98ab",
  measurementId: "G-Z5HVZPM75T"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// 環境に応じてエミュレーターを使用
if (process.env.NODE_ENV === 'development') {
  // ローカル開発時はFirebaseエミュレーターを使用
  // import { connectAuthEmulator } from "firebase/auth";
  // import { connectFirestoreEmulator } from "firebase/firestore";
  // import { connectFunctionsEmulator } from "firebase/functions";
  
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, "localhost", 8080);
  // connectFunctionsEmulator(functions, "localhost", 5001);
}

// デフォルトエクスポート
export default app;