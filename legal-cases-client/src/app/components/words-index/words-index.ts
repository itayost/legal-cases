import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LegalCasesService } from '../../services/legal-cases.service';
import { WordIndex } from '../../models/legal-case.model';

@Component({
  selector: 'app-words-index',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './words-index.html',
  styleUrls: ['./words-index.scss']
})
export class WordsIndex {
  // Inputs
  decisionId: number | null = null;
  orderBy: 'alpha' | 'freq' = 'freq';
  limit: number = 1000;

  // State
  wordIndex: WordIndex[] = [];
  loading: boolean = false;
  error: string = '';

  // Table
  displayedColumns: string[] = ['index', 'word_text', 'cnt'];

  constructor(private legalCasesService: LegalCasesService) {}

  loadWordIndex(): void {
    if (!this.decisionId) {
      this.error = 'נא להזין מזהה החלטה';
      return;
    }

    this.loading = true;
    this.error = '';
    this.wordIndex = [];

    this.legalCasesService.getWordIndex(this.decisionId, this.orderBy, this.limit).subscribe({
      next: (index) => {
        this.wordIndex = index;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = 'שגיאה בטעינת אינדקס מילים. אולי ההחלטה לא קיימת או אין לה טקסט?';
        console.error('Load word index error:', err);
      }
    });
  }
}
