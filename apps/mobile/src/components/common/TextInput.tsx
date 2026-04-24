import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function TextInput({ label, error, containerStyle, style, secureTextEntry, ...props }: InputProps) {
  const [hidden, setHidden] = useState(true);
  const isPassword = secureTextEntry === true;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrap}>
        <RNTextInput
          style={[styles.input, error && styles.inputError, isPassword && styles.inputWithIcon, style]}
          placeholderTextColor={colors.gray[400]}
          secureTextEntry={isPassword ? hidden : false}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setHidden((h) => !h)} activeOpacity={0.7}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.gray[400]}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[100],
    paddingHorizontal: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputError: {
    borderColor: colors.red[500],
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  error: {
    fontSize: typography.size.xs,
    color: colors.red[600],
  },
});
