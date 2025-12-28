import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

interface Props {
  size?: number;
}

const AnimatedPrayantraLogo: React.FC<Props> = ({ size = 180 }) => {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(800),
      Animated.timing(blinkAnim, {
        toValue: 0.08,
        duration: 120,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(blinkAnim, {
        toValue: 1,
        duration: 140,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 200 200">

        <Defs>
          <LinearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4F7CFF" />
            <Stop offset="100%" stopColor="#5FE0C7" />
          </LinearGradient>

          <RadialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#EAF0FF" />
          </RadialGradient>
        </Defs>

        {/* Outer Ring */}
        <Circle
          cx="100"
          cy="100"
          r="88"
          stroke="url(#mainGradient)"
          strokeWidth="10"
        />

        {/* Animated Eye Container */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            transform: [{ scaleY: blinkAnim }],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 200 200">
            <Path
              d="M70 100 C82 82, 118 82, 130 100
                 C118 118, 82 118, 70 100Z"
              fill="url(#eyeGlow)"
              stroke="url(#mainGradient)"
              strokeWidth={3}
            />

            {/* Pupil */}
            <Circle cx="100" cy="100" r="10" fill="url(#mainGradient)" />

            {/* Reflection */}
            <Circle cx="96" cy="96" r="3" fill="#FFFFFF" />
          </Svg>
        </Animated.View>

      </Svg>
    </View>
  );
};

export default AnimatedPrayantraLogo;
