import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';

import { LegalCasesService } from '../../services/legal-cases.service';
import { WordSearchResult, PhraseSearchResult } from '../../models/legal-case.model';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './search-page.html',
  styleUrl: './search-page.scss'
})
export class SearchPage {
  // Required inputs
  decisionId: number | null = null;
  searchQuery: string = '';
  searchType: 'word' | 'phrase' = 'word';

  // Context controls
  beforeLines: number = 2;
  afterLines: number = 2;
  maxResults: number = 100;

  // State
  loading: boolean = false;
  searchResults: WordSearchResult | PhraseSearchResult | null = null;
  error: string = '';

  constructor(private legalCasesService: LegalCasesService) {}

  performSearch(): void {
    if (!this.decisionId) {
      this.error = 'נא להזין מזהה החלטה';
      return;
    }

    if (!this.searchQuery.trim()) {
      this.error = 'נא להזין מונח חיפוש';
      return;
    }

    this.loading = true;
    this.error = '';
    this.searchResults = null;

    if (this.searchType === 'word') {
      this.legalCasesService.searchWord(
        this.decisionId,
        this.searchQuery.trim(),
        this.beforeLines,
        this.afterLines,
        this.maxResults
      ).subscribe({
        next: (results) => {
          this.searchResults = results;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = 'שגיאה בחיפוש. אולי ההחלטה לא קיימת או אין לה טקסט?';
          console.error('Search error:', err);
        }
      });
    } else {
      this.legalCasesService.searchPhrase(
        this.decisionId,
        this.searchQuery.trim(),
        this.beforeLines,
        this.afterLines,
        this.maxResults
      ).subscribe({
        next: (results) => {
          this.searchResults = results;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = 'שגיאה בחיפוש';
          console.error('Search error:', err);
        }
      });
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = null;
    this.error = '';
  }

  getSearchTerm(): string {
    if (!this.searchResults) return '';
    if (this.searchType === 'word') {
      return (this.searchResults as WordSearchResult).word;
    } else {
      return (this.searchResults as PhraseSearchResult).phrase;
    }
  }
}
