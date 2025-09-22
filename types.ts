
export enum Language {
  EN = 'EN',
  VI = 'VI',
}

export enum Tab {
  CREATIVE = 'Creative',
  HISTORY = 'History',
  ADMIN = 'Admin',
}

export enum Resolution {
  STANDARD = '1080p',
  HD = '2K',
  FOUR_K = '4K',
  EIGHT_K = '8K',
}

export enum PromptMode {
  SINGLE = 'Single',
  BATCH = 'Batch',
}

export interface HistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  originalImage: string; // base64 string
  generatedImage: string; // base64 string
  resolution: Resolution;
}
