import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Keyboard,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface OTPInputProps {
  length?: number;
  onComplete?: (otp: string) => void;
  onSubmit?: (otp: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  showSubmitButton?: boolean;
}

export interface OTPInputRef {
  clearAll: () => void;
  focus: () => void;
  getCurrentOtp: () => string;
}

const OTPInput = forwardRef<OTPInputRef, OTPInputProps>(({
  length = 6,
  onComplete,
  onSubmit,
  error = false,
  disabled = false,
  autoFocus = true,
  showSubmitButton = true,
}, ref) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<TextInput[]>([]);

  // Calculate responsive dimensions
  const calculateDimensions = () => {
    const totalSpacing = (length - 1) * 8; // Spacing between inputs
    const availableWidth = Math.min(screenWidth - 40, 400); // Max width 400, min padding
    const inputWidth = (availableWidth - totalSpacing) / length;
    
    return {
      inputWidth: Math.max(44, Math.min(60, inputWidth)), // Min 44, Max 60
      inputHeight: 60,
      containerWidth: availableWidth,
    };
  };

  const dimensions = calculateDimensions();

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 300);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    const newOtp = [...otp];
    
    // Handle paste
    if (text.length > 1) {
      const pastedDigits = text.replace(/[^0-9]/g, '').split('').slice(0, length);
      pastedDigits.forEach((digit, idx) => {
        if (idx < length) {
          newOtp[idx] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus last input
      const lastIndex = Math.min(pastedDigits.length, length - 1);
      inputsRef.current[lastIndex]?.focus();
      
      // Check if complete
      const currentOtp = newOtp.join('');
      if (currentOtp.length === length) {
        onComplete?.(currentOtp);
        if (!showSubmitButton) {
          Keyboard.dismiss();
        }
      }
      return;
    }

    // Single digit input
    // Only update if text is empty or a single digit
    if (text === '' || /^\d$/.test(text)) {
      newOtp[index] = text;
      setOtp(newOtp);

      // Auto-focus next input
      if (text && index < length - 1) {
        setTimeout(() => {
          inputsRef.current[index + 1]?.focus();
        }, 10);
      }

      // Check if all digits are entered
      const currentOtp = newOtp.join('');
      if (currentOtp.length === length) {
        onComplete?.(currentOtp);
        if (!showSubmitButton) {
          Keyboard.dismiss();
        }
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleInputFocus = (index: number) => {
    // Only clear if user taps on an input and there are empty digits before this index
    const firstEmptyIndex = otp.findIndex(digit => digit === '');
    
    if (firstEmptyIndex === -1) {
      // All digits filled, just move cursor to tapped index
      return;
    }
    
    if (index < firstEmptyIndex) {
      // User is trying to edit previous digits, clear from that point
      const newOtp = [...otp];
      for (let i = index; i < length; i++) {
        newOtp[i] = '';
      }
      setOtp(newOtp);
    }
  };

  const clearAll = () => {
    const newOtp = Array(length).fill('');
    setOtp(newOtp);
    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 10);
  };

  const focus = () => {
    inputsRef.current[0]?.focus();
  };

  const getCurrentOtp = () => {
    return otp.join('');
  };

  useImperativeHandle(ref, () => ({
    clearAll,
    focus,
    getCurrentOtp: () => otp.join(''),
  }));

  const handleSubmit = () => {
    const currentOtp = otp.join('');
    if (currentOtp.length === length) {
      onSubmit?.(currentOtp);
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inputsContainer, { width: dimensions.containerWidth }]}>
        {Array.from({ length }).map((_, index) => (
          <View key={index} style={styles.inputWrapper}>
            <TextInput
              ref={ref => {
                if (ref) inputsRef.current[index] = ref;
              }}
              style={[
                styles.input,
                { 
                  width: dimensions.inputWidth,
                  height: dimensions.inputHeight,
                },
                error && styles.inputError,
                otp[index] && styles.inputFilled,
              ]}
              value={otp[index]}
              onChangeText={text => handleChangeText(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              onFocus={() => handleInputFocus(index)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!disabled}
              selectTextOnFocus
              autoFocus={index === 0 && autoFocus}
              contextMenuHidden
            />
            {index < length - 1 && <View style={styles.separator} />}
          </View>
        ))}
      </View>
      
      {error && (
        <Text style={styles.errorText}>Invalid OTP. Please try again.</Text>
      )}
      
      {showSubmitButton && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            (disabled || otp.join('').length !== length) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={disabled || otp.join('').length !== length}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={styles.clearButton}
        onPress={clearAll}
        disabled={disabled}
      >
        <Text style={styles.clearButtonText}>Clear All</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  inputFilled: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  separator: {
    width: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  clearButtonText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default React.memo(OTPInput);