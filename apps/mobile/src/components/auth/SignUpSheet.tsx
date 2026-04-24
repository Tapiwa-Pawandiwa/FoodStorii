import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as api from '../../services/api';

const { height: H } = Dimensions.get('window');
const SHEET_HEIGHT = H * 0.72;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function SignUpSheet({ visible, onClose }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await api.signInWithGoogle();
      // Routing handled by _layout.tsx SIGNED_IN event
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      if (msg !== 'Sign-in cancelled') setError(msg);
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleEmail() {
    onClose();
    router.push('/(auth)/signup');
  }

  function handleSignIn() {
    onClose();
    router.push('/(auth)/signin');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={S.backdrop} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <View style={S.sheet}>
        {/* Drag handle */}
        <View style={S.handle} />

        {/* Tina avatar */}
        <View style={S.avatar}>
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
        </View>

        {/* Headline */}
        <Text style={S.headline}>Save this and track your kitchen</Text>
        <Text style={S.sub}>Sign up to get personalised recipes and kitchen management.</Text>

        {/* Auth buttons */}
        <View style={S.buttons}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={S.appleBtn} activeOpacity={0.88} onPress={handleEmail}>
              <Ionicons name="logo-apple" size={20} color="#F7F0F0" style={S.btnIcon} />
              <Text style={S.appleBtnText}>Continue with Apple</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={S.googleBtn}
            activeOpacity={0.88}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color="#1A1A18" style={S.btnIcon} />
            ) : (
              <Ionicons name="logo-google" size={18} color="#1A1A18" style={S.btnIcon} />
            )}
            <Text style={S.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.emailBtn} activeOpacity={0.88} onPress={handleEmail}>
            <Ionicons name="mail-outline" size={18} color="#25671E" style={S.btnIcon} />
            <Text style={S.emailBtnText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={S.error}>{error}</Text> : null}

        {/* Sign-in link */}
        <TouchableOpacity onPress={handleSignIn} style={S.signinLink}>
          <Text style={S.signinText}>
            Already have an account? <Text style={S.signinBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={S.legal}>By continuing you agree to our Terms & Privacy Policy</Text>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26,26,24,0.45)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#EAE4E4',
    borderRadius: 3,
    marginTop: 12,
    marginBottom: 28,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#25671E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A18',
    textAlign: 'center',
    lineHeight: 26,
  },
  sub: {
    fontSize: 13,
    color: '#5A5A52',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },

  buttons: {
    width: '100%',
    marginTop: 24,
    gap: 10,
  },

  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 999,
    backgroundColor: '#25671E',
  },
  appleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F7F0F0',
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EAE4E4',
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A18',
  },

  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 999,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#25671E',
  },
  emailBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25671E',
  },

  btnIcon: {
    marginRight: 10,
  },

  error: {
    fontSize: 13,
    color: '#E53E3E',
    marginTop: 12,
    textAlign: 'center',
  },

  signinLink: {
    marginTop: 20,
  },
  signinText: {
    fontSize: 13,
    color: '#5A5A52',
    textAlign: 'center',
  },
  signinBold: {
    color: '#48A111',
    fontWeight: '600',
  },

  legal: {
    fontSize: 11,
    color: '#C4BEB8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});
