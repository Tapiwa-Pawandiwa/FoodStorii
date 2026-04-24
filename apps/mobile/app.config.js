module.exports = {
  expo: {
    name: 'FoodStorii',
    slug: 'foodstorii',
    version: '0.1.0',
    scheme: 'foodstorii',
    orientation: 'portrait',
    icon: './assets/FoodStoriiLogo.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/FoodStoriiLogo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    newArchEnabled: true,
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.foodstorii.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#16a34a',
      },
      package: 'com.foodstorii.app',
    },
    plugins: [
      'expo-router',
      'expo-web-browser',
      'expo-secure-store',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/FoodStoriiLogo.png',
          imageWidth: 300,
          resizeMode: 'contain',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'FoodStorii needs access to your photos to scan receipts and identify food items.',
        },
      ],
      '@react-native-community/datetimepicker',
    ],
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
    },
  },
}
