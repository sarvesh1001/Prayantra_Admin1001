import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface MPINInputProps {
  length?: number;
  onComplete?: (mpin: string) => void;
  onSubmit?: (mpin: string) => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  showSubmitButton?: boolean;
  secureTextEntry?: boolean;
}

export interface MPINInputRef {
  clearAll: () => void;
  focus: () => void;
}

const MPINInput = forwardRef<MPINInputRef, MPINInputProps>(({
  length = 6,
  onComplete,
  onSubmit,
  error = false,
  disabled = false,
  autoFocus = true,
  showSubmitButton = true,
  secureTextEntry = true,
}, ref) => {
  const [mpin, setMpin] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<TextInput[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => {
        inputsRef.current[0]?.focus();
      }, 300);
    }
  }, [autoFocus]);

  // Calculate dimensions based on container width
  const calculateDimensions = () => {
    if (containerWidth === 0) return { inputWidth: 50, inputHeight: 60 };
    
    const totalSpacing = (length - 1) * 8; // Reduced spacing for better fit
    const availableWidth = containerWidth - 40; // Account for container padding
    const maxInputWidth = 60;
    const minInputWidth = 44;
    
    let inputWidth = (availableWidth - totalSpacing) / length;
    
    // Ensure input width stays within bounds
    if (inputWidth > maxInputWidth) {
      inputWidth = maxInputWidth;
    } else if (inputWidth < minInputWidth) {
      inputWidth = minInputWidth;
    }
    
    return {
      inputWidth,
      inputHeight: 60,
    };
  };

  const dimensions = calculateDimensions();

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    const newMpin = [...mpin];
    
    // Handle paste
    if (text.length > 1) {
      const pastedDigits = text.replace(/[^0-9]/g, '').split('').slice(0, length);
      pastedDigits.forEach((digit, idx) => {
        if (idx < length) {
          newMpin[idx] = digit;
        }
      });
      setMpin(newMpin);
      
      // Focus last input
      const lastIndex = Math.min(pastedDigits.length, length - 1);
      inputsRef.current[lastIndex]?.focus();
      
      // Check if complete
      const currentMpin = newMpin.join('');
      if (currentMpin.length === length) {
        onComplete?.(currentMpin);
        if (!showSubmitButton) {
          Keyboard.dismiss();
        }
      }
      return;
    }

    // Single digit input
    if (text === '' || /^\d$/.test(text)) {
      newMpin[index] = text;
      setMpin(newMpin);

      // Auto-focus next input
      if (text && index < length - 1) {
        inputsRef.current[index + 1]?.focus();
      }

      // Check if all digits are entered
      const currentMpin = newMpin.join('');
      if (currentMpin.length === length) {
        onComplete?.(currentMpin);
        if (!showSubmitButton) {
          Keyboard.dismiss();
        }
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !mpin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      const newMpin = [...mpin];
      newMpin[index - 1] = '';
      setMpin(newMpin);
    }
  };

  const handleInputFocus = (index: number) => {
    // Clear all inputs if user taps on any input
    const firstEmptyIndex = mpin.findIndex(digit => digit === '');
    if (firstEmptyIndex === -1 || index < firstEmptyIndex) {
      // User is trying to edit previous digits, clear from that point
      const newMpin = [...mpin];
      for (let i = index; i < length; i++) {
        newMpin[i] = '';
      }
      setMpin(newMpin);
    }
  };

  const clearAll = () => {
    const newMpin = Array(length).fill('');
    setMpin(newMpin);
    inputsRef.current[0]?.focus();
  };

  const focus = () => {
    inputsRef.current[0]?.focus();
  };

  const getCurrentMpin = () => {
    return mpin.join('');
  };

  useImperativeHandle(ref, () => ({
    clearAll,
    focus,
    getCurrentMpin: () => mpin.join(''),
  }));

  const handleSubmit = () => {
    const currentMpin = mpin.join('');
    if (currentMpin.length === length) {
      onSubmit?.(currentMpin);
      Keyboard.dismiss();
    }
  };

  const handleContainerLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setContainerWidth(width);
  };

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <View style={styles.inputsContainer}>
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
                mpin[index] && styles.inputFilled,
              ]}
              value={mpin[index]}
              onChangeText={text => handleChangeText(text, index)}
              onKeyPress={e => handleKeyPress(e, index)}
              onFocus={() => handleInputFocus(index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1}
              secureTextEntry={secureTextEntry}
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
        <Text style={styles.errorText}>Invalid MPIN. Please try again.</Text>
      )}
      
      {showSubmitButton && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            (disabled || mpin.join('').length !== length) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={disabled || mpin.join('').length !== length}
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    // flexWrap: 'wrap',
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
    width: 8, // Reduced from 10 to 8
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

export default React.memo(MPINInput);