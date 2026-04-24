import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: H } = Dimensions.get('window');

const LOGO = require('../../assets/FOODSTORII.png');

export default function SplashScreen() {
  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" />

      {/* Full-bleed food photo */}
      <ImageBackground
        source={require('../../assets/onboarding/green_salad.jpg')}
        style={S.photo}
        resizeMode="cover"
      >
        {/* Wordmark centred over photo */}
        <View style={S.logoWrap}>
          <Image source={LOGO} style={S.logo} resizeMode="contain" />
        </View>
      </ImageBackground>

      {/* Bottom panel — cream, sits over bottom 34% of photo */}
      <View style={S.panel}>
        <SafeAreaView edges={['bottom']} style={S.panelInner}>
          <Text style={S.headline}>Your kitchen.{'\n'}Actually organised.</Text>
          <Text style={S.subtitle}>Save money, waste less, eat better.</Text>

          <TouchableOpacity
            style={S.primaryBtn}
            onPress={() => router.replace('/(welcome)/slides')}
            activeOpacity={0.88}
          >
            <Text style={S.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/signin')}
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
            style={S.signInLink}
          >
            <Text style={S.signInText}>
              Already have an account?{' '}
              <Text style={S.signInBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </View>
  );
}

const PANEL_HEIGHT = H * 0.38;

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#25671E' },

  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: PANEL_HEIGHT - 28, // overlap with panel
    justifyContent: 'flex-start',
  },

  logoWrap: {
    marginTop: 80,
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 68,
  },

  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: '#F7F0F0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  panelInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    gap: 0,
  },

  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A18',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 12,
    color: '#5A5A52',
    marginTop: 8,
    lineHeight: 18,
  },

  primaryBtn: {
    backgroundColor: '#48A111',
    borderRadius: 999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  signInLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 13,
    color: '#5A5A52',
    textAlign: 'center',
  },
  signInBold: {
    color: '#48A111',
    fontWeight: '600',
  },
});
