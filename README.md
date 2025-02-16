# GatherPay

GatherPay is a mobile application that helps users overcome minimum order challenges on food delivery platforms by enabling them to join or create group orders based on proximity.

## Implementation Status

### Core Features
- ✅ Phone Authentication & User Management
- ✅ Digital Wallet System
- ✅ Geolocation & Group Discovery
- ✅ Group Chat & Communication
- ✅ Order Management & Verification
- ✅ Payment Processing & Splits
- ✅ Dispute Resolution System
- ✅ Location Privacy Controls
- ⚠️ Media Storage (Local implementation due to Firebase Storage being paid tier)

## Project Structure

```
gatherpay/
├── assets/                      # Static assets
│   ├── animations/             # Lottie animation files
│   │   ├── loading.json        # Loading animation
│   │   └── success.json        # Success animation
│   ├── images/                 # Image assets
│   │   ├── empty-groups.png    # Empty state illustrations
│   │   ├── empty-orders.png
│   │   └── empty-wallet.png
│   ├── icon.png                # App icon
│   ├── splash.png              # Splash screen
│   └── adaptive-icon.png       # Android adaptive icon
│
├── src/                        # Source code
│   ├── components/             # Reusable components
│   │   ├── ui/                # UI components
│   │   │   ├── Button.tsx     # Custom button component
│   │   │   ├── Card.tsx       # Custom card component
│   │   │   ├── Input.tsx      # Custom input component
│   │   │   ├── StatusBadge.tsx # Status indicator component
│   │   │   ├── EmptyState.tsx  # Empty state component
│   │   │   └── AnimatedNumber.tsx # Animated number display
│   │   ├── AddOrderItemModal.tsx  # Order item addition modal
│   │   ├── OrderDetailsModal.tsx  # Order details modal
│   │   ├── DeliveryCommunication.tsx # Delivery coordination
│   │   ├── GroupChat.tsx      # Real-time group chat
│   │   ├── RatingSystem.tsx   # User rating component
│   │   ├── DisputeResolution.tsx # Dispute handling component
│   │   └── SupportTicket.tsx  # Support ticketing system
│   │
│   ├── config/                 # Configuration files
│   │   ├── firebase.ts        # Firebase initialization
│   │   └── testUsers.ts       # Test user data
│   │
│   ├── contexts/              # React Context providers
│   │   ├── AuthContext.tsx    # Authentication context
│   │   └── WalletContext.tsx  # Wallet management context
│   │
│   ├── navigation/            # Navigation configuration
│   │   ├── AuthNavigator.tsx  # Auth flow navigation
│   │   └── MainNavigator.tsx  # Main app navigation
│   │
│   ├── screens/               # Screen components
│   │   ├── auth/             # Authentication screens
│   │   │   ├── LoginScreen.tsx     # Phone number input
│   │   │   └── OTPVerificationScreen.tsx # OTP verification
│   │   └── main/             # Main app screens
│   │       ├── HomeScreen.tsx      # Nearby groups display
│   │       ├── CreateGroupScreen.tsx # Group creation
│   │       ├── GroupDetailsScreen.tsx # Group management
│   │       ├── WalletScreen.tsx    # Wallet management
│   │       ├── ProfileScreen.tsx    # User profile
│   │       └── LocationPrivacyScreen.tsx # Location settings
│   │
│   ├── theme/                 # Theme configuration
│   │   └── index.ts           # Colors, spacing, typography
│   │
│   ├── types/                 # TypeScript type definitions
│   │   ├── env.d.ts           # Environment variables
│   │   └── navigation.d.ts    # Navigation types
│   │
│   └── utils/                 # Utility functions
│       ├── ErrorHandler.ts    # Error management
│       ├── LocationManager.ts  # Location tracking
│       ├── LocationPrivacyManager.ts # Location privacy
│       ├── MediaUploader.ts   # Media upload handling
│       ├── NotificationManager.ts # Push notifications
│       ├── OrderProcessor.ts   # Order processing
│       └── TransactionExport.ts # Transaction export
│
├── .env                       # Environment variables
├── app.config.js             # Expo configuration
├── App.tsx                   # Root component
├── babel.config.js           # Babel configuration
├── firestore.rules          # Firestore security rules
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation

```

## Key Features

1. **Authentication**
   - Phone number verification
   - OTP-based login
   - Test user support for development

2. **Wallet System**
   - Digital wallet management
   - Transaction history
   - Reward coins system
   - Collateral deposit requirement

3. **Location Services**
   - Real-time location tracking
   - Proximity-based group discovery
   - Location privacy controls
   - Geofencing for notifications

4. **Group Management**
   - Group creation and joining
   - Real-time chat
   - Order management
   - Split payments

5. **Security**
   - Comprehensive Firestore rules
   - Location privacy settings
   - Transaction immutability
   - Dispute resolution system

## Getting Started

### Prerequisites Installation

1. **Node.js & npm:**
   - Download and install Node.js (v14 or higher) from [nodejs.org](https://nodejs.org/)
   - npm comes bundled with Node.js

2. **Expo CLI:**
   ```bash
   npm install -g expo-cli
   ```

3. **Development Environment:**
   - For Android: Install [Android Studio](https://developer.android.com/studio)
   - For iOS: Install [Xcode](https://developer.apple.com/xcode/) (Mac only)

### Project Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd gatherpay
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update `.env` with your Firebase configuration:
     ```
     FIREBASE_API_KEY=your_api_key
     FIREBASE_AUTH_DOMAIN=your_auth_domain
     FIREBASE_PROJECT_ID=your_project_id
     FIREBASE_STORAGE_BUCKET=your_storage_bucket
     FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     FIREBASE_APP_ID=your_app_id
     FIREBASE_MEASUREMENT_ID=your_measurement_id
     ```

### Firebase Setup

1. **Create a Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Phone Authentication
   - Create a Firestore database

2. **Configure Firebase in the app:**
   - Copy the Firebase configuration from your project settings
   - Paste the values in your `.env` file

### Running the App

1. **Start the development server:**
   ```bash
   npm start
   # or
   expo start
   ```

2. **Run on Android:**
   - Open Android Studio and start an emulator
   - Press 'a' in the terminal or click 'Run on Android device/emulator' in Expo DevTools

3. **Run on iOS (Mac only):**
   - Open Xcode and start a simulator
   - Press 'i' in the terminal or click 'Run on iOS simulator' in Expo DevTools

4. **Run on Physical Device:**
   - Install 'Expo Go' app from [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Scan the QR code from terminal using:
     - Android: Expo Go app
     - iOS: Camera app

### Test Users

For development and testing, you can use these test phone numbers:
```
+911234567890 (Test User 1)
+911234567891 (Test User 2)
+911234567892 (Test User 3)
+911234567893 (Test User 4)
```
Test OTP code: `123456`

### Common Issues and Solutions

1. **Metro Bundler issues:**
   ```bash
   # Clear Metro cache
   expo start -c
   ```

2. **Dependencies issues:**
   ```bash
   # Clear npm cache and reinstall
   npm cache clean --force
   rm -rf node_modules
   npm install
   ```

3. **Android Emulator not connecting:**
   - Ensure Android Studio and emulator are running
   - Check ADB is installed and running
   - Try restarting the emulator

4. **iOS Simulator not connecting:**
   - Ensure Xcode is up to date
   - Try restarting the simulator

### Development Tools

- **Expo DevTools:** Available at `http://localhost:19002` when you start the app
- **React Native Debugger:** Recommended for debugging
- **Firebase Console:** Monitor authentication, database, and analytics

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- Firebase project
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Note on Media Storage

Currently, media uploads are handled locally due to Firebase Storage being a paid service. For production deployment, it's recommended to:
1. Enable Firebase Storage
2. Update MediaUploader.ts to use Firebase Storage
3. Configure appropriate security rules for media access

## License

This project is licensed under the MIT License.