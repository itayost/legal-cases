// models/legal-case.model.ts
// Updated to match server API schema

export interface LegalCase {
  decision_id?: number;
  source_slug?: string;
  source_url: string;
  court_name?: string;
  court_level?: string;
  decision_type?: string;
  case_number?: string;
  decision_title?: string;
  decision_date?: string;
  publish_date?: string;
  language_code?: string;
  summary_text?: string;
  keywords?: string;
  page_count?: number;
  file_size_bytes?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  files?: DecisionFile[];
}

export interface DecisionFile {
  file_id?: number;
  decision_id: number;
  file_url: string;
  file_title?: string;
  mime_type?: string;
  lang_code?: string;
  page_count?: number;
  file_size_bytes?: number;
  hash_sha256?: string;
  created_at?: string;
}

export interface WordIndex {
  word_text: string;
  cnt: number;
}

export interface WordSearchResult {
  word: string;
  occurrences: Array<{
    line_no: number;
    char_start: number;
    char_end: number;
    context: Array<{
      line: number;
      text: string;
    }>;
  }>;
}

export interface PhraseSearchResult {
  phrase: string;
  occurrences: Array<{
    line_no: number;
    char_start: number;
    char_end: number;
    context: Array<{
      line: number;
      text: string;
    }>;
  }>;
}

export interface LegalTermGroup {
  group_id?: number;
  name: string;
  description?: string;
}

export interface WordGroupIndex {
  decision_id: number;
  group_id: number;
  words: Array<{
    word: string;
    samples: Array<{
      line_no: number;
      char_start: number;
      char_end: number;
      context: Array<{
        line: number;
        text: string;
      }>;
    }>;
  }>;
}

export interface Statistics {
  lines: number;
  tokens: number;
  unique_words: number;
}