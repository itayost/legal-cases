import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { LegalCasesService } from '../../services/legal-cases.service';
import { LegalCase, WordIndex, WordSearchResult, PhraseSearchResult, Statistics } from '../../models/legal-case.model';

@Component({
  selector: 'app-case-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './case-details.html',
  styleUrl: './case-details.scss'
})
export class CaseDetails implements OnInit {
  decisionId: number | null = null;
  decision: LegalCase | null = null;
  caseText: string = '';
  wordIndex: WordIndex[] = [];
  statistics: Statistics | null = null;
  loading = false;
  error = '';

  // Search
  searchType: 'word' | 'phrase' = 'word';
  searchQuery: string = '';
  searchResults: WordSearchResult | PhraseSearchResult | null = null;
  searching = false;
  searchError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private legalCasesService: LegalCasesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.decisionId = +params['id'];
      if (this.decisionId) {
        this.loadDecisionDetails();
      }
    });
  }

  loadDecisionDetails(): void {
    if (!this.decisionId) return;

    this.loading = true;
    this.error = '';

    // Load decision metadata
    this.legalCasesService.getCase(this.decisionId).subscribe({
      next: (data: LegalCase) => {
        this.decision = data;
        this.loadCaseText();
        this.loadWordIndex();
        this.loadStatistics();
      },
      error: (err: any) => {
        this.loading = false;
        this.error = 'שגיאה בטעינת פרטי ההחלטה';
        console.error('Error loading decision:', err);
      }
    });
  }

  loadCaseText(): void {
    if (!this.decisionId) return;

    this.legalCasesService.getCaseText(this.decisionId).subscribe({
      next: (text) => {
        this.caseText = text;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading case text:', err);
      }
    });
  }

  loadWordIndex(): void {
    if (!this.decisionId) return;

    this.legalCasesService.getWordIndex(this.decisionId, 'freq', 100).subscribe({
      next: (index) => {
        this.wordIndex = index;
      },
      error: (err) => {
        console.error('Error loading word index:', err);
      }
    });
  }

  loadStatistics(): void {
    if (!this.decisionId) return;

    this.legalCasesService.getStatistics(this.decisionId).subscribe({
      next: (stats) => {
        this.statistics = stats;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
      }
    });
  }

  performSearch(): void {
    if (!this.decisionId || !this.searchQuery.trim()) {
      this.searchError = 'נא להזין מונח חיפוש';
      return;
    }

    this.searching = true;
    this.searchError = '';
    this.searchResults = null;

    if (this.searchType === 'word') {
      this.legalCasesService.searchWord(this.decisionId, this.searchQuery, 2, 2, 100).subscribe({
        next: (results) => {
          this.searchResults = results;
          this.searching = false;
        },
        error: (err) => {
          this.searching = false;
          this.searchError = 'שגיאה בחיפוש';
          console.error('Search error:', err);
        }
      });
    } else {
      this.legalCasesService.searchPhrase(this.decisionId, this.searchQuery, 2, 2, 100).subscribe({
        next: (results) => {
          this.searchResults = results;
          this.searching = false;
        },
        error: (err) => {
          this.searching = false;
          this.searchError = 'שגיאה בחיפוש';
          console.error('Search error:', err);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  printCase(): void {
    window.print();
  }

  deleteDecision(): void {
    if (!this.decisionId) return;
    if (!confirm('האם אתה בטוח שברצונך למחוק החלטה זו?')) return;

    this.legalCasesService.deleteCase(this.decisionId).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = 'שגיאה במחיקת ההחלטה';
        console.error('Delete error:', err);
      }
    });
  }
}
