import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryProvider } from './src/contexts/QueryProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/components/Toast';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { initializeDeviceInfo } from './src/services/deviceInfo';
import * as SplashScreenModule from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreenModule.preventAutoHideAsync();

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [deviceInitialized, setDeviceInitialized] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await initializeDeviceInfo();
        setDeviceInitialized(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreenModule.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady || !deviceInitialized) {
    return <SplashScreen onFinish={() => {}} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;