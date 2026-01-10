import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut as firebaseSignOut, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Lazy initialization - only initialize when needed
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let appleProvider: OAuthProvider | null = null;

function initializeFirebase() {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    firebaseAuth = getAuth(firebaseApp);
    googleProvider = new GoogleAuthProvider();
    appleProvider = new OAuthProvider('apple.com');
  }
  return { app: firebaseApp, auth: firebaseAuth!, googleProvider: googleProvider!, appleProvider: appleProvider! };
}

export const signInWithGoogle = async () => {
  try {
    const { auth, googleProvider } = initializeFirebase();
    console.log("Attempting Google sign-in with popup...");
    
    // Use popup only - redirect doesn't work in storage-partitioned browsers
    const result = await signInWithPopup(auth, googleProvider);
    console.log("✅ Popup sign-in successful:", result.user.email);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    // Handle popup blocked
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup was blocked. Please allow popups for this site and try again.");
    }
    
    // Handle popup closed by user
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in was cancelled. Please try again.");
    }
    
    throw new Error(error.message || "Google sign-in failed. Please try email/password login.");
  }
};

export const signInWithApple = async () => {
  try {
    const { auth, appleProvider } = initializeFirebase();
    console.log("Attempting Apple sign-in with popup...");
    
    // Use popup only - redirect doesn't work in storage-partitioned browsers
    const result = await signInWithPopup(auth, appleProvider);
    console.log("✅ Apple sign-in successful:", result.user.email);
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (error: any) {
    console.error("Apple sign-in error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    // Handle popup blocked
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Popup was blocked. Please allow popups for this site and try again.");
    }
    
    // Handle popup closed by user
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in was cancelled. Please try again.");
    }
    
    throw new Error(error.message || "Apple sign-in failed. Please try email/password login.");
  }
};

export const handleRedirectResult = async () => {
  // Redirect-based auth is deprecated due to storage partitioning issues
  // Keeping this function for backwards compatibility but it will return null
  console.log("Redirect-based auth is deprecated, using popup-only flow");
  return null;
};

export const signOut = async () => {
  try {
    const { auth } = initializeFirebase();
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};
