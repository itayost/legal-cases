import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';

import { LegalCasesService } from '../../services/legal-cases.service';
import { WordGroupIndex } from '../../models/legal-case.model';

@Component({
  selector: 'app-legal-terms-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule
  ],
  templateUrl: './legal-terms-groups.html',
  styleUrl: './legal-terms-groups.scss'
})
export class LegalTermsGroups {
  // Create Group
  groupName: string = '';
  groupDescription: string = '';
  createdGroupId: number | null = null;
  creatingGroup: boolean = false;
  createError: string = '';
  createSuccess: boolean = false;

  // Add Words
  wordsInput: string = '';
  addingWords: boolean = false;
  addWordsError: string = '';
  addWordsSuccess: boolean = false;
  addedCount: number = 0;

  // View Index
  viewGroupId: number | null = null;
  viewDecisionId: number | null = null;
  wordGroupIndex: WordGroupIndex | null = null;
  loadingIndex: boolean = false;
  indexError: string = '';

  constructor(private legalCasesService: LegalCasesService) {}

  // Create word group
  createGroup(): void {
    if (!this.groupName.trim()) {
      this.createError = 'נא להזין שם לקבוצה';
      return;
    }

    this.creatingGroup = true;
    this.createError = '';
    this.createSuccess = false;

    this.legalCasesService.createWordGroup(
      this.groupName.trim(),
      this.groupDescription.trim() || undefined
    ).subscribe({
      next: (response) => {
        this.createdGroupId = response.id;
        this.creatingGroup = false;
        this.createSuccess = true;
        this.createError = '';
        console.log('Group created with ID:', response.id);
      },
      error: (err) => {
        this.creatingGroup = false;
        this.createError = 'שגיאה ביצירת קבוצה';
        console.error('Create group error:', err);
      }
    });
  }

  // Reset create form
  resetCreateForm(): void {
    this.groupName = '';
    this.groupDescription = '';
    this.createdGroupId = null;
    this.createSuccess = false;
    this.createError = '';
  }

  // Add words to group
  addWordsToGroup(): void {
    if (!this.createdGroupId) {
      this.addWordsError = 'אין קבוצה נבחרת. צור קבוצה תחילה.';
      return;
    }

    if (!this.wordsInput.trim()) {
      this.addWordsError = 'נא להזין מילים';
      return;
    }

    const words = this.wordsInput
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    if (words.length === 0) {
      this.addWordsError = 'נא להזין מילים תקינות';
      return;
    }

    this.addingWords = true;
    this.addWordsError = '';
    this.addWordsSuccess = false;

    this.legalCasesService.addWordsToGroup(this.createdGroupId, words).subscribe({
      next: (response) => {
        this.addingWords = false;
        this.addWordsSuccess = true;
        this.addWordsError = '';
        this.addedCount = response.added;
        this.wordsInput = ''; // Clear input
        console.log(`Added ${response.added} words to group`);
      },
      error: (err) => {
        this.addingWords = false;
        this.addWordsError = 'שגיאה בהוספת מילים';
        console.error('Add words error:', err);
      }
    });
  }

  // Load group index
  loadGroupIndex(): void {
    if (!this.viewGroupId || !this.viewDecisionId) {
      this.indexError = 'נא להזין מזהה קבוצה ומזהה החלטה';
      return;
    }

    this.loadingIndex = true;
    this.indexError = '';
    this.wordGroupIndex = null;

    this.legalCasesService.getWordGroupIndex(
      this.viewGroupId,
      this.viewDecisionId,
      5
    ).subscribe({
      next: (index) => {
        this.loadingIndex = false;
        this.wordGroupIndex = index;
        this.indexError = '';
      },
      error: (err) => {
        this.loadingIndex = false;
        this.indexError = 'שגיאה בטעינת אינדקס קבוצה';
        this.wordGroupIndex = null;
        console.error('Load index error:', err);
      }
    });
  }
}
