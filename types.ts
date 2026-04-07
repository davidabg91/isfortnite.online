export enum ServerStatus {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR'
}

export interface StatusResponse {
  status: ServerStatus;
  message: string;
  timestamp: Date;
}



export interface CheckResult {
  isOnline: boolean;
  messages: Record<Language, string>;
}

export type Language = 'en' | 'bg' | 'es' | 'de' | 'fr' | 'it' | 'ru';

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  price: number;
  imageUrl: string;
  isBundle: boolean;
}

export interface ShopResponse {
  date: string;
  vbuckIcon: string;
  items: ShopItem[];
}