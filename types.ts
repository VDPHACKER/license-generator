
export interface LicenseRequest {
  macAddress?: string;
  durationDays: number;
}

export interface LicenseResponse {
  success: boolean;
  licenseKey: string;
  expirationDate: string;
  message?: string;
  timestamp?: string; // Added for history sorting
  macAddress?: string; // Added for history display
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type TabType = 'HOME' | 'HISTORY' | 'ADMIN';

export interface User {
  username: string;
  role: string;
}
