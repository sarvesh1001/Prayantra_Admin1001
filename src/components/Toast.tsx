import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ToastContextType {
  showToast: (
    type: 'success' | 'error' | 'info',
    message: string,
    duration?: number
  ) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProps {
  type: 'success' | 'error' | 'info';
  message: string;
  visible: boolean;
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ type, message, visible, onHide }) => {
  const [animation] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      const timer = setTimeout(() => {
        hide();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.spring(animation, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start(() => {
      onHide();
    });
  };

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          color: '#10B981',
          bgColor: '#D1FAE5',
          borderColor: '#A7F3D0',
        };
      case 'error':
        return {
          icon: 'alert-circle',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          borderColor: '#FECACA',
        };
      case 'info':
      default:
        return {
          icon: 'information',
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          borderColor: '#BFDBFE',
        };
    }
  };

  const config = getConfig();

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 10],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={config.icon as any}
          size={20}
          color={config.color}
        />

        <Text style={[styles.message, { color: config.color }]}>
          {message}
        </Text>

        <TouchableOpacity onPress={hide} style={styles.closeButton}>
          <MaterialCommunityIcons
            name="close"
            size={16}
            color={config.color}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    visible: boolean;
  }>({
    type: 'success',
    message: '',
    visible: false,
  });

  const showToast = useCallback(
    (type: 'success' | 'error' | 'info', message: string, duration = 3000) => {
      setToast({ type, message, visible: true });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Toast
        type={toast.type}
        message={toast.message}
        visible={toast.visible}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
});
