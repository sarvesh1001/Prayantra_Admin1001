import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';

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
};

const RootStack = () => {
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
    initialRouteName = SCREENS.MAIN_DASHBOARD;
  } else if (phoneNumber) {
    // If we have phone number but not authenticated, go to MPIN verification
    initialRouteName = SCREENS.VERIFY_MPIN;
  }

  console.log('📍 Initial Route:', initialRouteName);

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      {/* Auth Screens */}
      <Stack.Screen name={SCREENS.LOGIN_INITIATE} component={LoginInitiateScreen} />
      <Stack.Screen name={SCREENS.SEND_OTP} component={SendOTPScreen} />
      <Stack.Screen name={SCREENS.VERIFY_OTP} component={VerifyOTPScreen} />
      <Stack.Screen name={SCREENS.SETUP_MPIN} component={SetupMPINScreen} />
      <Stack.Screen name={SCREENS.VERIFY_MPIN} component={VerifyMPINScreen} />
      <Stack.Screen name={SCREENS.FORGOT_MPIN} component={ForgotMPINScreen} />
      
      {/* Main App Screens */}
      <Stack.Screen name={SCREENS.MAIN_DASHBOARD} component={MainDashboardScreen} />
      <Stack.Screen name={SCREENS.PROFILE} component={ProfileScreen} />
      <Stack.Screen name={SCREENS.CHANGE_MPIN} component={ChangeMPINScreen} />
      <Stack.Screen name={SCREENS.DEPARTMENT} component={DepartmentScreen} />
    </Stack.Navigator>
  );
};

export default RootStack;
// import React, { useEffect, useRef } from 'react';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { useAuth } from '@/contexts/AuthContext';
// import { View, ActivityIndicator } from 'react-native';
// import { CommonActions, NavigationContainerRef } from '@react-navigation/native';

// // Screens
// import LoginInitiateScreen from '@/screens/auth/LoginInitiateScreen';
// import SendOTPScreen from '@/screens/auth/SendOTPScreen';
// import VerifyOTPScreen from '@/screens/auth/VerifyOTPScreen';
// import SetupMPINScreen from '@/screens/auth/SetupMPINScreen';
// import VerifyMPINScreen from '@/screens/auth/VerifyMPINScreen';
// import ForgotMPINScreen from '@/screens/auth/ForgotMPINScreen';
// import MainDashboardScreen from '@/screens/dashboard/MainDashboardScreen';
// import ProfileScreen from '@/screens/profile/ProfileScreen';
// import ChangeMPINScreen from '@/screens/profile/ChangeMPINScreen';
// import DepartmentScreen from '@/screens/dashboard/DepartmentScreen';

// const Stack = createNativeStackNavigator();

// // Create a navigation ref
// export const navigationRef = React.createRef<NavigationContainerRef<any>>();

// // Define all screen names as constants to avoid typos
// const SCREENS = {
//   LOGIN_INITIATE: 'LoginInitiate',
//   SEND_OTP: 'SendOTP',
//   VERIFY_OTP: 'VerifyOTP',
//   SETUP_MPIN: 'SetupMPIN',
//   VERIFY_MPIN: 'VerifyMPIN',
//   FORGOT_MPIN: 'ForgotMPIN',
//   MAIN_DASHBOARD: 'MainDashboard',
//   PROFILE: 'Profile',
//   CHANGE_MPIN: 'ChangeMPIN',
//   DEPARTMENT: 'Department',
// };

// const RootStack = () => {
//   const { isAuthenticated, isLoading, isInitializing, phoneNumber, validateSession } = useAuth();
//   const initialRouteChecked = useRef(false);

//   console.log('🔄 AppNavigator State:', {
//     isAuthenticated,
//     isLoading,
//     isInitializing,
//     phoneNumber,
//     hasPhone: !!phoneNumber
//   });

//   // Validate session when app starts or when authentication state changes
//   useEffect(() => {
//     const checkSessionAndNavigate = async () => {
//       if (isAuthenticated && !isLoading && !isInitializing) {
//         try {
//           console.log('🔍 Validating session on app start...');
//           const isValid = await validateSession();
          
//           if (!isValid) {
//             console.log('❌ Session invalid on app start, forcing logout');
//             // We'll handle this in the AuthContext, but reset navigation
//             if (navigationRef.current) {
//               navigationRef.current.dispatch(
//                 CommonActions.reset({
//                   index: 0,
//                   routes: [{ name: SCREENS.VERIFY_MPIN }],
//                 })
//               );
//             }
//           }
//         } catch (error) {
//           console.error('❌ Session validation error on app start:', error);
//         }
//       }
//     };

//     if (!initialRouteChecked.current) {
//       initialRouteChecked.current = true;
//       checkSessionAndNavigate();
//     }
//   }, [isAuthenticated, isLoading, isInitializing, validateSession]);

//   // Show loading screen with proper component
//   if (isLoading || isInitializing) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
//         <ActivityIndicator size="large" color="#C084FC" />
//       </View>
//     );
//   }

//   // Determine initial route based on authentication state
//   let initialRouteName = SCREENS.LOGIN_INITIATE;
  
//   if (isAuthenticated) {
//     initialRouteName = SCREENS.MAIN_DASHBOARD;
//   } else if (phoneNumber) {
//     // If we have phone number but not authenticated, go to MPIN verification
//     initialRouteName = SCREENS.VERIFY_MPIN;
//   }

//   console.log('📍 Initial Route:', initialRouteName);

//   return (
//     <Stack.Navigator 
//       screenOptions={{ headerShown: false }}
//       initialRouteName={initialRouteName}
//     >
//       {/* Auth Screens */}
//       <Stack.Screen name={SCREENS.LOGIN_INITIATE} component={LoginInitiateScreen} />
//       <Stack.Screen name={SCREENS.SEND_OTP} component={SendOTPScreen} />
//       <Stack.Screen name={SCREENS.VERIFY_OTP} component={VerifyOTPScreen} />
//       <Stack.Screen name={SCREENS.SETUP_MPIN} component={SetupMPINScreen} />
//       <Stack.Screen name={SCREENS.VERIFY_MPIN} component={VerifyMPINScreen} />
//       <Stack.Screen name={SCREENS.FORGOT_MPIN} component={ForgotMPINScreen} />
      
//       {/* Main App Screens */}
//       <Stack.Screen name={SCREENS.MAIN_DASHBOARD} component={MainDashboardScreen} />
//       <Stack.Screen name={SCREENS.PROFILE} component={ProfileScreen} />
//       <Stack.Screen name={SCREENS.CHANGE_MPIN} component={ChangeMPINScreen} />
//       <Stack.Screen name={SCREENS.DEPARTMENT} component={DepartmentScreen} />
//     </Stack.Navigator>
//   );
// };

// export default RootStack;