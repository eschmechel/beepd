// apps/backend/types/api.ts

export type SharingMode = 'OFF' | 'FRIENDS_ONLY' | 'EVERYONE';

export interface UserSettings {
  userId: number;
  mode: SharingMode;
  radiusMeters: number;
  displayName: string | null;
  friendCode: string;
  showFriendsOnMap: boolean;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  isSimulated?: boolean;
}

export interface NearbyUser {
  userId: number;
  displayName: string | null;
  distanceCategory: 'within 100m' | 'within 500m' | 'within 1km' | 'within 5km';
  lastUpdated: string;
  isFriend?: boolean;
}

export interface NearbyResponse {
  nearby: NearbyUser[];
  newAlerts: number[];
}

export interface Friend {
  userId: number;
  displayName: string | null;
  friendCode: string;
  createdAt: string;
}

export interface FriendsResponse {
  friends: Friend[];
  myFriendCode: string;
}

export type ConsentPurpose = 'LOCATION' | 'CALENDAR' | 'CONTACTS' | 'ANALYTICS';

export interface ConsentGrant {
  purpose: ConsentPurpose;
  granted: boolean;
  version: string;
  grantedAt: string;
  withdrawnAt?: string;
}

export interface ExportData {
  exportDate: string;
  user: {
    id: number;
    displayName: string | null;
    friendCode: string;
    createdAt: string;
  };
  settings: UserSettings;
  consentHistory: ConsentGrant[];
  friends: Friend[];
}