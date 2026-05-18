import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  getIdToken,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
}

export async function signUp(email: string, password: string, fullName: string): Promise<AuthTokens> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: fullName });
  await sendEmailVerification(credential.user);
  const idToken = await getIdToken(credential.user);
  return { idToken, refreshToken: credential.user.refreshToken };
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await getIdToken(credential.user);
  return { idToken, refreshToken: credential.user.refreshToken };
}

export async function refreshIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return getIdToken(user, true);
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (user) await sendEmailVerification(user);
}

export function isEmailVerified(): boolean {
  return auth.currentUser?.emailVerified ?? false;
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export { auth, onAuthStateChanged };
