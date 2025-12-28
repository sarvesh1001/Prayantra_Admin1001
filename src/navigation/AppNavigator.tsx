import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
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
const Drawer = createDrawerNavigator();

function MainDrawer() {
  const { adminInfo } = useAuth();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerStyle: {
          width: '75%',
        },
      }}
    >
      <Drawer.Screen 
        name="MainDashboard" 
        component={MainDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      
      {/* Dynamic Department Screens */}
      {adminInfo?.departments.map((department, index) => (
        <Drawer.Screen
          key={department}
          name={`Department_${department.replace(/\s+/g, '_')}`}
          component={DepartmentScreen}
          initialParams={{ department }}
          options={{
            title: department,
            drawerLabel: department,
          }}
        />
      ))}
      
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
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
          <Stack.Screen name="MainDrawer" component={MainDrawer} />
          <Stack.Group screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="ChangeMPIN" component={ChangeMPINScreen} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}