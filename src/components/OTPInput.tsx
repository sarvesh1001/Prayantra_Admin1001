import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  error = false,
  disabled = false,
  autoFocus = true,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<TextInput[]>([]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 100);
    }
  }, [autoFocus]);

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    const newOtp = [...otp];
    
    // Handle paste
    if (text.length > 1) {
      const pastedDigits = text.split('').slice(0, length);
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
      if (pastedDigits.length === length) {
        onComplete(pastedDigits.join(''));
      }
      return;
    }

    // Single digit input
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    // Check if all digits are entered
    const currentOtp = newOtp.join('');
    if (currentOtp.length === length) {
      onComplete(currentOtp);
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleInputFocus = (index: number) => {
    // Clear the input when focusing if it's not the first empty one
    const firstEmptyIndex = otp.findIndex(digit => digit === '');
    if (firstEmptyIndex !== -1 && index > firstEmptyIndex) {
      inputsRef.current[firstEmptyIndex]?.focus();
    }
  };

  const clearOtp = () => {
    setOtp(Array(length).fill(''));
    inputsRef.current[0]?.focus();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.inputsContainer}>
          {Array.from({ length }).map((_, index) => (
            <View key={index} style={styles.inputWrapper}>
              <TextInput
                ref={ref => {
                  if (ref) inputsRef.current[index] = ref;
                }}
                style={[
                  styles.input,
                  error && styles.inputError,
                  otp[index] && styles.inputFilled,
                ]}
                value={otp[index]}
                onChangeText={text => handleChangeText(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                onFocus={() => handleInputFocus(index)}
                keyboardType="number-pad"
                maxLength={index === 0 ? length : 1}
                editable={!disabled}
                selectTextOnFocus
                autoFocus={index === 0 && autoFocus}
                contextMenuHidden
              />
            </View>
          ))}
        </View>
        
        {error && (
          <Text style={styles.errorText}>Invalid OTP. Please try again.</Text>
        )}
        
        <TouchableWithoutFeedback onPress={clearOtp} disabled={disabled}>
          <View style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear OTP</Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  inputWrapper: {
    alignItems: 'center',
  },
  input: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  inputFilled: {
    borderColor: '#C084FC', // Purple
    backgroundColor: '#FAF5FF',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  clearButton: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: '#C084FC', // Purple
    fontSize: 14,
    fontWeight: '500',
  },
});

export default React.memo(OTPInput);