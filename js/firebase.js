// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js";
//import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCJI4stDucwLS8OeD3QmwW2p-24eLQ7YVs",
  authDomain: "week13dv.firebaseapp.com",
  projectId: "week13dv",
  storageBucket: "week13dv.firebasestorage.app",
  messagingSenderId: "1020561560621",
  appId: "1:1020561560621:web:766d2fdc4325717d1f54a4",
  measurementId: "G-RCZE2ZSZ5L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

const auth = getAuth(app);


document.getElementById('signupForm').addEventListener("submit", async(e)=>{
    e.preventDefault();
    let email = document.getElementById('signUpEmail').value;
    let password = document.getElementById('signUpPass').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account has been created succesfully");
        window.location.href = "Signup.html";
    }catch (error){
            alert(error.message);
        }

    
});


document.getElementById('loginForm').addEventListener("submit", async(e)=>{
    e.preventDefault();
    let email = document.getElementById('signInEmail').value;
    let password = document.getElementById('signInPass').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert("login has been succesfully");
        window.location.href = "../index.html";
    }catch (error){
            alert(error.message);
        }

    
});