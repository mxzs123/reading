interface DictionaryMeaning {
  pos?: string | null;
  translation: string;
}

export interface DictionaryData {
  phonetics?: {
    us?: string;
    uk?: string;
  };
  meanings: DictionaryMeaning[];
  webTranslations: Array<{
    key: string;
    translations: string[];
  }>;
}
