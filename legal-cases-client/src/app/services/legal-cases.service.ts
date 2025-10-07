// services/legal-cases.service.ts
// Updated to match server API endpoints

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LegalCase, WordIndex, WordSearchResult, PhraseSearchResult, LegalTermGroup, WordGroupIndex, Statistics } from '../models/legal-case.model';

@Injectable({
  providedIn: 'root'
})
export class LegalCasesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // --- Decisions ---

  // קבלת פסק דין ספציפי
  getCase(id: number): Observable<LegalCase> {
    return this.http.get<LegalCase>(`${this.apiUrl}/decisions/${id}`);
  }

  // יצירת פסק דין חדש
  createCase(caseData: Partial<LegalCase>): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/decisions`, caseData);
  }

  // עדכון פסק דין
  updateCase(id: number, caseData: Partial<LegalCase>): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${this.apiUrl}/decisions/${id}`, caseData);
  }

  // מחיקת פסק דין
  deleteCase(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl}/decisions/${id}`);
  }

  // --- Text Management ---

  // קבלת טקסט של פסק דין
  getCaseText(id: number, from?: number, to?: number): Observable<string> {
    let url = `${this.apiUrl}/decisions/${id}/text`;
    const params: string[] = [];
    if (from !== undefined) params.push(`from=${from}`);
    if (to !== undefined) params.push(`to=${to}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get(url, { responseType: 'text' });
  }

  // העלאת טקסט (TXT file או JSON)
  uploadCaseText(id: number, textOrFile: string | File): Observable<{ ok: boolean; lines: number; unique_words: number; tokens: number }> {
    if (typeof textOrFile === 'string') {
      // JSON format
      return this.http.post<any>(`${this.apiUrl}/decisions/${id}/text`, { text: textOrFile });
    } else {
      // Multipart file upload
      const formData = new FormData();
      formData.append('file', textOrFile);
      return this.http.post<any>(`${this.apiUrl}/decisions/${id}/text`, formData);
    }
  }

  // --- Files ---

  // הוספת קובץ לפסק דין
  addDecisionFile(decisionId: number, fileData: {
    file_url: string;
    file_title?: string;
    mime_type?: string;
    lang_code?: string;
    page_count?: number;
    file_size_bytes?: number;
    hash_sha256?: string;
  }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/decisions/${decisionId}/files`, fileData);
  }

  // --- Word Index ---

  // קבלת אינדקס מילים לפסק דין
  getWordIndex(decisionId: number, order: 'alpha' | 'freq' = 'alpha', limit: number = 1000): Observable<WordIndex[]> {
    return this.http.get<WordIndex[]>(`${this.apiUrl}/decisions/${decisionId}/words?order=${order}&limit=${limit}`);
  }

  // --- Search ---

  // חיפוש מילה ספציפית בפסק דין
  searchWord(
    decisionId: number,
    word: string,
    before: number = 2,
    after: number = 2,
    max: number = 100
  ): Observable<WordSearchResult> {
    return this.http.get<WordSearchResult>(
      `${this.apiUrl}/decisions/${decisionId}/search/word?q=${encodeURIComponent(word)}&before=${before}&after=${after}&max=${max}`
    );
  }

  // חיפוש ביטוי בפסק דין
  searchPhrase(
    decisionId: number,
    phrase: string,
    before: number = 2,
    after: number = 2,
    max: number = 100
  ): Observable<PhraseSearchResult> {
    return this.http.get<PhraseSearchResult>(
      `${this.apiUrl}/decisions/${decisionId}/search/phrase?q=${encodeURIComponent(phrase)}&before=${before}&after=${after}&max=${max}`
    );
  }

  // --- Word Groups ---

  // יצירת קבוצת מילים חדשה
  createWordGroup(name: string, description?: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.apiUrl}/groups`, { name, description });
  }

  // הוספת מילים לקבוצה
  addWordsToGroup(groupId: number, words: string[]): Observable<{ ok: boolean; added: number }> {
    return this.http.post<any>(`${this.apiUrl}/groups/${groupId}/words`, { words });
  }

  // קבלת אינדקס קבוצת מילים לפסק דין
  getWordGroupIndex(groupId: number, decisionId: number, limitPerWord: number = 5): Observable<WordGroupIndex> {
    return this.http.get<WordGroupIndex>(
      `${this.apiUrl}/groups/${groupId}/index?decision_id=${decisionId}&limit_per_word=${limitPerWord}`
    );
  }

  // --- Statistics ---

  // קבלת סטטיסטיקה לפסק דין
  getStatistics(decisionId: number): Observable<Statistics> {
    return this.http.get<Statistics>(`${this.apiUrl}/decisions/${decisionId}/stats`);
  }
}