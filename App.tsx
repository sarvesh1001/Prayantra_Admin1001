import 'react-native-gesture-handler';
import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  StatusBar as RNStatusBar
} from 'react-native';
import { QueryProvider } from './src/contexts/QueryProvider';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/components/Toast';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { initializeDeviceInfo } from './src/services/deviceInfo';
import * as SplashScreenModule from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreenModule.preventAutoHideAsync();

const App = () => {
  const [isReady, setIsReady] = useState(false);
  const [deviceInitialized, setDeviceInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const prepare = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  // Show error screen
  if (error) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={[
            styles.errorContainer,
            { paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }
          ]}>
            <Text style={styles.errorTitle}>Initialization Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                setIsReady(false);
                setDeviceInitialized(false);
                prepare();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }

  // Show splash screen while loading
  if (!isReady || !deviceInitialized) {
    return <SplashScreen />;
  }

  // Main app with KeyboardAvoidingView for Android
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <NavigationContainer ref={navigationRef}>
                <KeyboardAvoidingView 
                  style={{ flex: 1 }}
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                  <AppNavigator />
                </KeyboardAvoidingView>
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
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;