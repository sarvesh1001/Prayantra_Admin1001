import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

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
import CustomDrawerContent from '@/components/CustomDrawerContent';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Create a navigation ref
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

// Define all screen names as constants to avoid typos
const SCREENS = {
  LOGIN_INITIATE: 'LoginInitiate',
  SEND_OTP: 'SendOTP',
  VERIFY_OTP: 'VerifyOTP',
  SETUP_MPIN: 'SetupMPIN',
  VERIFY_MPIN: 'VerifyMPIN',
  FORGOT_MPIN: 'ForgotMPIN',
  MAIN_DASHBOARD: 'MainDashboard',
  PROFILE: 'Profile',
  CHANGE_MPIN: 'ChangeMPIN',
  DEPARTMENT: 'Department',
  MAIN_DRAWER: 'MainDrawer',
};

// Drawer Navigator Component
const MainDrawer = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent props={props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        overlayColor: 'transparent',
        drawerStyle: {
          width: 300,
          backgroundColor: 'transparent',
        },
        drawerActiveTintColor: '#C084FC',
        drawerInactiveTintColor: '#64748B',
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
          marginLeft: -16,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 4,
        },
      }}
    >
      <Drawer.Screen
        name={SCREENS.MAIN_DASHBOARD}
        component={MainDashboardScreen}
        options={{
          drawerLabel: 'Dashboard',
          drawerIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name={SCREENS.PROFILE}
        component={ProfileScreen}
        options={{
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name={SCREENS.CHANGE_MPIN}
        component={ChangeMPINScreen}
        options={{
          drawerLabel: 'Change MPIN',
          drawerIcon: ({ color, size }) => (
            <Icon name="key-change" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name={SCREENS.DEPARTMENT}
        component={DepartmentScreen}
        options={{
          drawerLabel: 'Department Details',
          drawerIcon: ({ color, size }) => (
            <Icon name="office-building" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

// Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading, isInitializing, phoneNumber } = useAuth();

  console.log('🔄 AppNavigator State:', {
    isAuthenticated,
    isLoading,
    isInitializing,
    phoneNumber,
    hasPhone: !!phoneNumber
  });

  // Show loading screen with proper component
  if (isLoading || isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#C084FC" />
      </View>
    );
  }

  // Determine initial route based on authentication state
  let initialRouteName = SCREENS.LOGIN_INITIATE;
  
  if (isAuthenticated) {
    initialRouteName = SCREENS.MAIN_DRAWER;
  } else if (phoneNumber) {
    // If we have phone number but not authenticated, go to MPIN verification
    initialRouteName = SCREENS.VERIFY_MPIN;
  }

  console.log('📍 Initial Route:', initialRouteName);

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName={initialRouteName}
    >
      {/* Auth Screens */}
      <Stack.Screen 
        name={SCREENS.LOGIN_INITIATE} 
        component={LoginInitiateScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name={SCREENS.SEND_OTP} 
        component={SendOTPScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name={SCREENS.VERIFY_OTP} 
        component={VerifyOTPScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name={SCREENS.SETUP_MPIN} 
        component={SetupMPINScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name={SCREENS.VERIFY_MPIN} 
        component={VerifyMPINScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen 
        name={SCREENS.FORGOT_MPIN} 
        component={ForgotMPINScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      
      {/* Main App Screens */}
      <Stack.Screen 
        name={SCREENS.MAIN_DRAWER} 
        component={MainDrawer}
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;