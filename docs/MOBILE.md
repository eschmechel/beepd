# Mobile Architecture

> Expo, React Native, location handling, and push notifications.

## Overview

The mobile app uses **Expo** with **Expo Router** for file-based navigation, **NativeWind** for Tailwind-style styling, and native modules for location and notifications.

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Expo SDK 52+ | React Native tooling |
| Router | Expo Router | File-based navigation |
| UI | NativeWind | Tailwind for React Native |
| Maps | react-native-maps | Native map components |
| Location | expo-location | GPS access |
| Storage | AsyncStorage | Persistent state |
| Notifications | expo-notifications | Push notifications |
| Build | EAS Build | Cloud builds for iOS/Android |

## Project Structure

```
apps/mobile/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout (providers, auth check)
│   ├── index.tsx                 # Home/nearby screen
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Nearby tab
│   │   ├── friends.tsx           # Friends tab
│   │   └── settings.tsx          # Settings tab
│   ├── (auth)/
│   │   ├── _layout.tsx           # Auth layout (no tabs)
│   │   ├── welcome.tsx           # Welcome/onboarding
│   │   └── register.tsx          # Registration flow
│   └── friend/[id].tsx           # Friend detail screen
│
├── components/
│   ├── NearbyList.tsx            # Uses @beepd/ui
│   ├── MapView.tsx               # react-native-maps wrapper
│   ├── SharingToggle.tsx         # Uses @beepd/ui
│   └── FriendCard.tsx
│
├── hooks/
│   ├── useLocation.ts            # expo-location wrapper
│   ├── useNotifications.ts       # expo-notifications
│   └── useAuth.ts
│
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
├── package.json
└── tsconfig.json
```

## Shared Code Strategy

The monorepo enables code sharing between web and mobile:

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button.tsx            # Works in React + React Native
│   │   ├── Card.tsx
│   │   └── SharingToggle.tsx     # Shared logic
│   │
│   ├── stores/                   # Zustand stores (shared)
│   │   ├── authStore.ts          # Works with localStorage + AsyncStorage
│   │   └── settingsStore.ts
│   │
│   └── hooks/
│       ├── useNearby.ts          # TanStack Query logic
│       └── useSettings.ts
```

### Platform-Specific Storage

```typescript
// packages/ui/src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = Platform.OS === 'web' 
  ? createJSONStorage(() => localStorage)
  : createJSONStorage(() => AsyncStorage);

export const useAuthStore = create()(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'beepd-auth',
      storage,
    }
  )
);
```

## Platform-Specific Components

For features that differ between web and mobile, use `.native.tsx` suffix:

```typescript
// packages/ui/src/components/MapView/MapView.tsx (web)
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

export function MapView({ userLocation, nearbyUsers }) {
  return (
    <MapContainer center={[0, 0]} zoom={13}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {/* markers */}
    </MapContainer>
  );
}

// packages/ui/src/components/MapView/MapView.native.tsx (mobile)
import RNMapView, { Marker } from 'react-native-maps';

export function MapView({ userLocation, nearbyUsers }) {
  return (
    <RNMapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: userLocation?.lat ?? 0,
        longitude: userLocation?.lng ?? 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      {/* markers */}
    </RNMapView>
  );
}
```

## Location Handling

```typescript
// apps/mobile/hooks/useLocation.ts
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { api } from '@beepd/api-client';
import { useSettingsStore } from '@beepd/ui/stores';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { sharingMode } = useSettingsStore();
  
  useEffect(() => {
    let subscription: Location.LocationSubscription;
    
    async function startTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      
      // Get initial location
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      
      // Only track if sharing is enabled
      if (sharingMode !== 'OFF') {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50, // Update every 50 meters
            timeInterval: 30000,  // Or every 30 seconds
          },
          async (newLocation) => {
            setLocation(newLocation);
            // Update backend
            await api.updateLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              accuracy: newLocation.coords.accuracy,
            });
          }
        );
      }
    }
    
    startTracking();
    
    return () => {
      subscription?.remove();
    };
  }, [sharingMode]);
  
  return { location, error };
}
```

## Push Notifications

```typescript
// apps/mobile/hooks/useNotifications.ts
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { api } from '@beepd/api-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useNotifications() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  
  useEffect(() => {
    async function setup() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      
      // Get push token and register with backend
      const token = await Notifications.getExpoPushTokenAsync();
      await api.registerPushToken(token.data);
      
      // Listen for incoming notifications
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
        }
      );
      
      // Listen for notification responses (user tapped)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const { nearbyUserId } = response.notification.request.content.data;
          // Navigate to friend detail
        }
      );
    }
    
    setup();
    
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}
```

## EAS Build Configuration

```json
// apps/mobile/eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      }
    }
  }
}
```

## App Configuration

```json
// apps/mobile/app.json
{
  "expo": {
    "name": "Beepd",
    "slug": "beepd",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "beepd",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "app.beepd.mobile",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to find friends nearby",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "Background location helps alert you when friends are near"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "app.beepd.mobile",
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow Beepd to use your location to find friends nearby"
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

## Development Commands

```bash
# Start Expo dev server
pnpm --filter mobile start

# Run on iOS simulator
pnpm --filter mobile ios

# Run on Android emulator
pnpm --filter mobile android

# Build for development
eas build --profile development --platform ios
eas build --profile development --platform android

# Build for production
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See also:
- [Frontend Architecture](FRONTEND.md)
- [Architecture Overview](ARCHITECTURE.md)
