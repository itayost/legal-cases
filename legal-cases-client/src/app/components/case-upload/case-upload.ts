import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

import { LegalCasesService } from '../../services/legal-cases.service';

@Component({
  selector: 'app-case-upload',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './case-upload.html',
  styleUrl: './case-upload.scss'
})
export class CaseUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  uploading = false;
  uploadSuccess = false;
  uploadError = '';
  isDragging = false;

  courtLevels = [
    'בית המשפט העליון',
    'בית משפט מחוזי',
    'בית משפט השלום',
    'בית דין לעבודה',
    'בית המשפט לענייני משפחה',
    'בית משפט צבאי'
  ];

  decisionTypes = [
    'פסק דין',
    'החלטה',
    'צו',
    'פסק בוררות'
  ];

  statusOptions = [
    'PUBLISHED',
    'DRAFT',
    'ARCHIVED'
  ];

  constructor(
    private fb: FormBuilder,
    private legalCasesService: LegalCasesService
  ) {
    this.uploadForm = this.fb.group({
      source_url: ['', [Validators.required]],
      source_slug: [''],
      case_number: [''],
      decision_title: [''],
      court_name: [''],
      court_level: [''],
      decision_type: [''],
      decision_date: [''],
      publish_date: [''],
      language_code: ['he'],
      summary_text: [''],
      keywords: [''],
      status: ['PUBLISHED']
    });
  }

  // File handling
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type - server only accepts TXT for indexing
      if (!file.name.endsWith('.txt') && file.type !== 'text/plain') {
        this.uploadError = 'סוג קובץ לא נתמך. יש להעלות קובץ TXT בלבד לאינדוקס טקסט.';
        return;
      }

      // Validate file size (max 50MB to match server limit)
      if (file.size > 50 * 1024 * 1024) {
        this.uploadError = 'הקובץ גדול מדי. גודל מקסימלי: 50MB';
        return;
      }

      this.selectedFile = file;
      this.uploadError = '';
    }
  }

  removeFile(): void {
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fakeEvent = { target: { files: [file] } };
      this.onFileSelected(fakeEvent);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Form submission
  onSubmit(): void {
    if (this.uploadForm.invalid) {
      this.uploadError = 'נא למלא את כל השדות הנדרשים (source_url הוא שדה חובה)';
      return;
    }

    this.uploading = true;
    this.uploadError = '';
    this.uploadSuccess = false;

    // Step 1: Create decision metadata
    const decisionData = {
      ...this.uploadForm.value,
      decision_date: this.formatDate(this.uploadForm.value.decision_date),
      publish_date: this.formatDate(this.uploadForm.value.publish_date)
    };

    this.legalCasesService.createCase(decisionData).subscribe({
      next: (response) => {
        const decisionId = response.id;

        // Step 2: Upload text file if provided
        if (this.selectedFile) {
          this.legalCasesService.uploadCaseText(decisionId, this.selectedFile).subscribe({
            next: (textResponse) => {
              this.uploading = false;
              this.uploadSuccess = true;
              this.uploadError = '';
              console.log('Text indexed:', textResponse);

              // Reset form after 2 seconds
              setTimeout(() => {
                this.resetForm();
              }, 2000);
            },
            error: (error) => {
              this.uploading = false;
              this.uploadSuccess = false;
              this.uploadError = 'פסק הדין נוצר אך שגיאה באינדוקס הטקסט. נא להעלות טקסט ידנית.';
              console.error('Text upload error:', error);
            }
          });
        } else {
          // No text file, just metadata
          this.uploading = false;
          this.uploadSuccess = true;
          this.uploadError = '';

          setTimeout(() => {
            this.resetForm();
          }, 2000);
        }
      },
      error: (error) => {
        this.uploading = false;
        this.uploadSuccess = false;
        this.uploadError = 'שגיאה ביצירת פסק הדין. נא לנסות שוב.';
        console.error('Create decision error:', error);
      }
    });
  }

  formatDate(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  resetForm(): void {
    this.uploadForm.reset({
      language_code: 'he',
      status: 'PUBLISHED'
    });
    this.selectedFile = null;
    this.uploadSuccess = false;
    this.uploadError = '';
  }
}
