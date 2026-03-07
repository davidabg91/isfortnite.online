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

export interface NewsItem {
  title: Record<Language, string>;
  summary: Record<Language, string>;
  url: string;
  imageUrl?: string; // Optional image URL
  date: string;
}

export interface CheckResult {
  isOnline: boolean;
  messages: Record<Language, string>; // Kept for backward compatibility, serves as Official
  rumorMessages: Record<Language, string>; // New field for rumors
  news: NewsItem[]; // New field for news
  sources?: { uri: string; title: string }[];
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
  aiAnalysis?: {
    score: number; // 1-10
    reason: Record<Language, string>;
    rarityScore: number;
    recommendedCombos?: string[];
  };
}

export interface ShopResponse {
  date: string;
  vbuckIcon: string;
  items: ShopItem[];
  aiOverallAnalysis?: Record<Language, string>;
}