import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';

// Screens
import LoginInitiateScreen from '@/screens/auth/LoginInitiateScreen';
import SendOTPScreen from '@/screens/auth/SendOTPScreen';
import VerifyOTPScreen from '@/screens/auth/VerifyOTPScreen';
import SetupMPINScreen from '@/screens/auth/SetupMPINScreen';
import VerifyMPINScreen from '@/screens/auth/VerifyMPINScreen';
import ForgotMPINScreen from '@/screens/auth/ForgotMPINScreen';
import MainDashboardScreen from '@/screens/dashboard/MainDashboardScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import ChangeMPINScreen from '@/screens/profile/ChangeMPINScreen';
import DepartmentScreen from '@/screens/dashboard/DepartmentScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading screen
  if (isLoading) {
    return null; // Or a simple loading component
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="LoginInitiate" component={LoginInitiateScreen} />
          <Stack.Screen name="SendOTP" component={SendOTPScreen} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
          <Stack.Screen name="SetupMPIN" component={SetupMPINScreen} />
          <Stack.Screen name="VerifyMPIN" component={VerifyMPINScreen} />
          <Stack.Screen name="ForgotMPIN" component={ForgotMPINScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ChangeMPIN" component={ChangeMPINScreen} />
          <Stack.Screen name="Department" component={DepartmentScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}