import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native'; // Added missing imports
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        await initializeDeviceInfo();
        setDeviceInitialized(true);

        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e: any) {
        console.error('App initialization failed:', e);
        setError(e.message || 'Unknown error');
      } finally {
        setIsReady(true);
        try {
          await SplashScreenModule.hideAsync();
        } catch (e) {
          console.error('Failed to hide splash screen:', e);
        }
      }
    }

    prepare();
  }, []);

  // Show error screen
  if (error) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Initialization Error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Show splash screen while loading
  if (!isReady || !deviceInitialized) {
    return <SplashScreen />;
  }

  // Main app
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

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    color: '#DC2626',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#7F1D1D',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default App;