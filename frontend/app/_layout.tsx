/**
 * Root Layout — App entry with Verdana Health design system
 */
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

// Font imports
import { 
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold 
} from '@expo-google-fonts/plus-jakarta-sans';
import { 
  DMSans_400Regular,
  DMSans_500Medium 
} from '@expo-google-fonts/dm-sans';
import { 
  FiraCode_400Regular 
} from '@expo-google-fonts/fira-code';

import { Surfaces, Brand } from '@/constants/Colors';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Custom light theme matching Verdana Health
const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.primary,
    background: Surfaces.background,
    card: Surfaces.default,
    text: Brand.primary,
    border: Surfaces.border,
    notification: Brand.info,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    FiraCode_400Regular,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={AppLightTheme}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="zone-detail"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user-detail"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
