export default {
  name: 'GatherPay',
  slug: 'gatherpay',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.yourusername.gatherpay'
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff'
    },
    package: 'com.yourusername.gatherpay',
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION'
    ]
  },
  plugins: [
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow GatherPay to use your location to find nearby groups.'
      }
    ]
  ],
  extra: {
    eas: {
      projectId: 'your-project-id'
    }
  }
};