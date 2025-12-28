import React, { useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Easing, 
  Dimensions,
  Text 
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  G,
} from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Main color from your Expo config - ONLY FOR BACKGROUND
const SPLASH_BACKGROUND_COLOR = '#C084FC';
// Original logo colors (keeping these from your original design)
const LOGO_GRADIENT_START = '#4A00E0';
const LOGO_GRADIENT_MID = '#8E2DE2';
const LOGO_GRADIENT_END = '#00B4DB';
const LIGHT_BLUE = '#00B4DB';
const WHITE_GLOW = '#FFFFFF';

const SplashScreen: React.FC = () => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const dashAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;
  const cubeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start all animations
    Animated.parallel([
      // Rotating animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      
      // Pulsing scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      
      // Floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ),
      
      // Text fade in animation (delayed)
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      
      // Ring animations
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
      
      // Particle animations (around logo center only)
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
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const opacity = fadeAnim;
  const textOpacity = textFadeAnim;

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

  return (
    <View style={[styles.container, { backgroundColor: SPLASH_BACKGROUND_COLOR }]}>
      {/* Animated background gradient - using your purple color */}
      <Animated.View style={[styles.background, { opacity }]}>
        <Svg width={width} height={height} style={styles.backgroundSvg}>
          <Defs>
            <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#9D4EDD" />
              <Stop offset="50%" stopColor={SPLASH_BACKGROUND_COLOR} />
              <Stop offset="100%" stopColor="#E0AAFF" />
            </LinearGradient>
          </Defs>
          <Path d={`M0,0 H${width} V${height} H0 Z`} fill="url(#bgGrad)" />
        </Svg>
      </Animated.View>

      {/* Main animated logo - KEEPING ORIGINAL BLUE COLORS */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { rotate },
              { scale: scaleAnim },
              { translateY: floatY },
            ],
            opacity,
          },
        ]}
      >
        <Svg width={200} height={200} viewBox="0 0 200 200">
          <Defs>
            {/* ORIGINAL LOGO GRADIENTS */}
            <LinearGradient id="splashGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={LOGO_GRADIENT_START} stopOpacity="1" />
              <Stop offset="50%" stopColor={LOGO_GRADIENT_MID} stopOpacity="1" />
              <Stop offset="100%" stopColor={LOGO_GRADIENT_END} stopOpacity="1" />
            </LinearGradient>
            
            <LinearGradient id="splashGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={LOGO_GRADIENT_END} stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#0083B0" stopOpacity="0.9" />
            </LinearGradient>
            
            <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          
          {/* Animated outer rings */}
          <G>
            <AnimatedCircle 
              cx="100"
              cy="100"
              r={ring1Radius}
              fill="none"
              stroke="url(#splashGrad1)"
              strokeWidth="2"
            />
            
            <AnimatedCircle 
              cx="100"
              cy="100"
              r={ring2Radius}
              fill="none"
              stroke="rgba(142, 45, 226, 0.4)"
              strokeWidth="1.5"
            />
          </G>
          
          {/* Central core with animations */}
          <G>
            <Circle cx="100" cy="100" r="30" fill="url(#splashGrad2)" />
            
            {/* Neural network paths */}
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
            
            {/* Animated particles around center - ORIGINAL BLUE COLOR */}
            {[...Array(6)].map((_, i) => {
              const angle = (i * 60) * Math.PI / 180;
              const radius = 50;
              const x = 100 + radius * Math.cos(angle);
              const y = 100 + radius * Math.sin(angle);
              
              return (
                <AnimatedCircle
                  key={i}
                  cx={x}
                  cy={y}
                  r={particleAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 6],
                  })}
                  fill={LOGO_GRADIENT_END}
                  opacity={particleAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  })}
                />
              );
            })}
            
            {/* Center tech element with rotation */}
            <AnimatedPath
              d="M90,90 L110,90 L110,110 L90,110 Z"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              rotation={cubeRotate}
            />
            
            {/* Center glow */}
            <Circle cx="100" cy="100" r="35" fill="url(#centerGlow)" />
          </G>
        </Svg>
      </Animated.View>

      {/* App name with fade-in animation and box styling */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
        <Text style={styles.appName}>PRAYANTRA</Text>
        <Text style={styles.tagline}>Powering Enterprises</Text>
        <Text style={styles.subtitle}>Integrated · Efficient · Future-ready</Text>
      </Animated.View>

      {/* Loading dots - ORIGINAL BLUE COLOR */}
      <Animated.View style={[styles.loadingContainer, { opacity }]}>
        {[...Array(3)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.loadingDot,
              {
                backgroundColor: LIGHT_BLUE,
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.dotInner,
                {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 1, 0],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Animated.View>
        ))}
      </Animated.View>
    </View>
  );
};

// Helper components for animated SVG elements
const AnimatedCircle = ({ cx, cy, r, fill, stroke, strokeWidth, opacity, ...props }: any) => {
  return (
    <Circle
      cx={typeof cx === 'string' ? cx : cx?.__getValue?.() ?? cx}
      cy={typeof cy === 'string' ? cy : cy?.__getValue?.() ?? cy}
      r={typeof r === 'string' ? r : r?.__getValue?.() ?? r}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={typeof opacity === 'string' ? opacity : opacity?.__getValue?.() ?? opacity}
      {...props}
    />
  );
};

const AnimatedPath = ({ d, fill, stroke, strokeWidth, strokeDasharray, strokeDashoffset, rotation, ...props }: any) => {
  const transform = rotation ? `rotate(${typeof rotation === 'string' ? rotation : rotation?.__getValue?.() ?? rotation})` : undefined;
  
  return (
    <Path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeDashoffset={typeof strokeDashoffset === 'string' ? strokeDashoffset : strokeDashoffset?.__getValue?.() ?? strokeDashoffset}
      transform={transform}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND_COLOR, // Your Expo color
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundSvg: {
    position: 'absolute',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Semi-transparent white
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 3,
    marginBottom: 10,
    textShadowColor: 'rgba(74, 0, 224, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  tagline: {
    fontSize: 22,
    color: LIGHT_BLUE, // Original blue color
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 180, 219, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    marginTop: 50,
    alignItems: 'center',
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
    backgroundColor: LIGHT_BLUE, // Original blue color
    shadowColor: LIGHT_BLUE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
  },
  dotInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 6,
  },
});

export default SplashScreen;