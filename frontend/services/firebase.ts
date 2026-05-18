import {
  getAuth,
  signInWithCredential,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signOut,
  GoogleAuthProvider,
  getIdToken,
} from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export interface AuthTokens {
  idToken: string;
  refreshToken: string;
}

async function getTokensFromUser(user: FirebaseAuthTypes.User): Promise<AuthTokens> {
  const idToken = await getIdToken(user);
  return { idToken, refreshToken: idToken };
}

export async function signInWithGoogle(): Promise<AuthTokens> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!response.data?.idToken) {
    throw new Error('Google sign-in failed: no ID token');
  }
  const credential = GoogleAuthProvider.credential(response.data.idToken);
  const result = await signInWithCredential(getAuth(), credential);
  return getTokensFromUser(result.user);
}

export async function signInWithCustomToken(customToken: string): Promise<AuthTokens> {
  const result = await firebaseSignInWithCustomToken(getAuth(), customToken);
  return getTokensFromUser(result.user);
}

export async function refreshIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return getIdToken(user, true);
}

export async function logout(): Promise<void> {
  await signOut(getAuth());
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return getAuth().currentUser;
}
