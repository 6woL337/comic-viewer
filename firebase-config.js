import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyAoihL9o8PbsQIZDeU_13G0hUBd0qIqq8I",
  authDomain: "comic-viewer-4a317.firebaseapp.com",
  databaseURL: "https://comic-viewer-4a317-default-rtdb.firebaseio.com",
  projectId: "comic-viewer-4a317",
  storageBucket: "comic-viewer-4a317.firebasestorage.app",
  messagingSenderId: "875475306792",
  appId: "1:875475306792:web:cca5be3bd23ed9a3a4681d",
  measurementId: "G-MQXQFTWFN9"
};


const app =
  initializeApp(firebaseConfig);


const db =
  getFirestore(app);


export {
  app,
  db
};