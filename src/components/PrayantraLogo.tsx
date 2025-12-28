import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  G,
  Text as SvgText,
} from 'react-native-svg';

interface PrayantraLogoProps {
  size?: number;
  animated?: boolean;
  style?: ViewStyle;
  showText?: boolean;
}

export const PrayantraLogo: React.FC<PrayantraLogoProps> = ({
  size = 100,
  animated = false,
  style,
  showText = true,
}) => {
  // Animation refs for logo elements
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const dashAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const cubeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      // Start all animations
      Animated.parallel([
        // Ring 1 animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(ring1Anim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(ring1Anim, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        ),
        
        // Ring 2 animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(ring2Anim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(ring2Anim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        ),
        
        // Dash animation
        Animated.loop(
          Animated.timing(dashAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: false,
          })
        ),
        
        // Cube rotation
        Animated.loop(
          Animated.timing(cubeAnim, {
            toValue: 1,
            duration: 10000,
            easing: Easing.linear,
            useNativeDriver: false,
          })
        ),
        
        // Glow animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.5,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        ),
        
        // Particle animations
        ...particleAnims.map((anim, index) => 
          Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 1,
                duration: 1000 + index * 200,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 1000 + index * 200,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
            ])
          )
        ),
      ]).start();
    }
  }, [animated]);

  const ring1Radius = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [85, 95],
  });

  const ring2Radius = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 75],
  });

  const dashOffset = dashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const dashOffset2 = dashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const cubeRotate = cubeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0 100 100', '45 100 100'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  return (
    <View style={[styles.container, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <LinearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4A00E0" stopOpacity="1" />
            <Stop offset="50%" stopColor="#8E2DE2" stopOpacity="1" />
            <Stop offset="100%" stopColor="#00B4DB" stopOpacity="1" />
          </LinearGradient>
          
          <LinearGradient id="grad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#00B4DB" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#0083B0" stopOpacity="0.9" />
          </LinearGradient>
          
          <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        {/* Outer rings */}
        <G>
          {/* Animated outer ring 1 */}
          {animated ? (
            <AnimatedCircle 
              cx="100"
              cy="100"
              r={ring1Radius}
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="2"
            />
          ) : (
            <Circle cx="100" cy="100" r="85" fill="none" stroke="url(#grad1)" strokeWidth="2" />
          )}
          
          {/* Animated outer ring 2 */}
          {animated ? (
            <AnimatedCircle 
              cx="100"
              cy="100"
              r={ring2Radius}
              fill="none"
              stroke="rgba(142, 45, 226, 0.4)"
              strokeWidth="1.5"
            />
          ) : (
            <Circle cx="100" cy="100" r="70" fill="none" stroke="rgba(142, 45, 226, 0.4)" strokeWidth="1.5" />
          )}
        </G>
        
        {/* Central core */}
        <G>
          {/* Center circle */}
          <Circle cx="100" cy="100" r="30" fill="url(#grad2)" />
          
          {/* Neural network paths */}
          {animated ? (
            <>
              <AnimatedPath
                d="M70,100 Q100,70 130,100 Q100,130 70,100"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeDasharray="5,5"
                strokeDashoffset={dashOffset}
              />
              <AnimatedPath
                d="M100,70 Q130,100 100,130 Q70,100 100,70"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeDasharray="5,5"
                strokeDashoffset={dashOffset2}
              />
            </>
          ) : (
            <>
              <Path
                d="M70,100 Q100,70 130,100 Q100,130 70,100"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeDasharray="5,5"
              />
              <Path
                d="M100,70 Q130,100 100,130 Q70,100 100,70"
                fill="none"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                strokeDasharray="5,5"
              />
            </>
          )}
          
          {/* Animated particles around center */}
          {[...Array(6)].map((_, i) => {
            const angle = (i * 60) * Math.PI / 180;
            const radius = 50;
            const x = 100 + radius * Math.cos(angle);
            const y = 100 + radius * Math.sin(angle);
            
            if (animated) {
              return (
                <AnimatedCircle
                  key={i}
                  cx={x}
                  cy={y}
                  r={particleAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 6],
                  })}
                  fill="#00B4DB"
                  opacity={particleAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  })}
                />
              );
            } else {
              return (
                <Circle key={i} cx={x} cy={y} r="4" fill="#00B4DB" opacity="0.8" />
              );
            }
          })}
          
          {/* Center cube/tech element */}
          {animated ? (
            <AnimatedPath
              d="M90,90 L110,90 L110,110 L90,110 Z"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              rotation={cubeRotate}
            />
          ) : (
            <Path
              d="M90,90 L110,90 L110,110 L90,110 Z"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
          
          {/* Center glow with animation */}
          {animated ? (
            <AnimatedCircle 
              cx="100"
              cy="100"
              r="35"
              fill="url(#centerGlow)"
              opacity={glowOpacity}
            />
          ) : (
            <Circle cx="100" cy="100" r="35" fill="url(#centerGlow)" opacity="0.8" />
          )}
        </G>
        
        {/* App Name and Tagline */}
        {showText && (
          <G>
            <SvgText
              x="100"
              y="170"
              textAnchor="middle"
              fill="white"
              fontSize="14"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              PRAYANTRA
            </SvgText>
            <SvgText
              x="100"
              y="185"
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize="8"
              fontFamily="sans-serif"
            >
              Powering Enterprise
            </SvgText>
          </G>
        )}
      </Svg>
    </View>
  );
};

// Helper components for animated SVG elements
const AnimatedCircle = ({ cx, cy, r, fill, stroke, strokeWidth, opacity, ...props }: any) => {
  const getValue = (value: any) => {
    if (value && typeof value === 'object' && 'interpolate' in value) {
      return value.__getValue ? value.__getValue() : value;
    }
    return value;
  };

  return (
    <Circle
      cx={getValue(cx)}
      cy={getValue(cy)}
      r={getValue(r)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={getValue(opacity)}
      {...props}
    />
  );
};

const AnimatedPath = ({ d, fill, stroke, strokeWidth, strokeDasharray, strokeDashoffset, rotation, ...props }: any) => {
  const getValue = (value: any) => {
    if (value && typeof value === 'object' && 'interpolate' in value) {
      return value.__getValue ? value.__getValue() : value;
    }
    return value;
  };

  const transform = rotation ? `rotate(${getValue(rotation)})` : undefined;
  
  return (
    <Path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeDashoffset={getValue(strokeDashoffset)}
      transform={transform}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PrayantraLogo;