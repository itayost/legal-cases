# Client-Server Integration Summary

## Completed Changes

### 1. Data Models ([legal-case.model.ts](legal-cases-client/src/app/models/legal-case.model.ts))

✅ **Removed** (unsupported by server):
- `Judge` interface
- `Party` interface
- `LegalPhrase` interface
- Old `SearchResult`, `WordOccurrence` interfaces
- Old `Statistics` interface with totalCases/totalWordGroups

✅ **Updated/Added**:
- `LegalCase` → Now uses `decision_id`, `source_url` (required), `court_name`, `court_level`, `decision_date`, etc.
- `DecisionFile` → New interface for attached files
- `WordIndex` → word_text + cnt
- `WordSearchResult` → Matches server response with context
- `PhraseSearchResult` → Matches server response with context
- `LegalTermGroup` → Simplified (name + description only)
- `WordGroupIndex` → For group index results
- `Statistics` → lines, tokens, unique_words

### 2. Service Layer ([legal-cases.service.ts](legal-cases-client/src/app/services/legal-cases.service.ts))

✅ **Removed methods** (no server endpoints):
- `getAllCases()`
- `getCaseJudges()`, `getCaseParties()`
- `search()` with global filters
- `findSimilarCases()`
- `getStatistics()` without decisionId
- `exportData()`, `importData()` (XML)
- `getAllWordGroups()`, `getWordGroup()`, `updateWordGroup()`, `deleteWordGroup()`, `removeWordFromGroup()`
- `getAllPhrases()` and all phrase CRUD
- `getAllWords()`, `getWordOccurrences()`, `searchWords()`, `searchByLocation()`

✅ **Updated endpoints**:
| Client Method | Server Endpoint | Description |
|--------------|----------------|-------------|
| `getCase(id)` | `GET /api/decisions/:id` | Get decision metadata + files |
| `createCase(data)` | `POST /api/decisions` | Create decision (returns `{id}`) |
| `updateCase(id, data)` | `PUT /api/decisions/:id` | Update decision (returns `{ok}`) |
| `deleteCase(id)` | `DELETE /api/decisions/:id` | Delete decision |
| `getCaseText(id, from?, to?)` | `GET /api/decisions/:id/text` | Get text with line ranges |
| `uploadCaseText(id, file\|text)` | `POST /api/decisions/:id/text` | Upload TXT file or JSON text |
| `addDecisionFile(id, data)` | `POST /api/decisions/:id/files` | Attach file metadata |
| `getWordIndex(id, order, limit)` | `GET /api/decisions/:id/words` | Word frequencies (alpha/freq) |
| `searchWord(id, word, ...)` | `GET /api/decisions/:id/search/word` | Search word with context |
| `searchPhrase(id, phrase, ...)` | `GET /api/decisions/:id/search/phrase` | Search phrase with context |
| `createWordGroup(name, desc)` | `POST /api/groups` | Create word group |
| `addWordsToGroup(id, words[])` | `POST /api/groups/:id/words` | Add words to group |
| `getWordGroupIndex(groupId, decisionId, limit)` | `GET /api/groups/:id/index` | Get group index for decision |
| `getStatistics(decisionId)` | `GET /api/decisions/:id/stats` | Get decision statistics |

### 3. Case Upload Component ([case-upload.ts](legal-cases-client/src/app/components/case-upload/case-upload.ts) + [.html](legal-cases-client/src/app/components/case-upload/case-upload.html))

✅ **Changes**:
- **Removed**: Judges and Parties FormArrays completely
- **Updated form fields**:
  - `source_url` (required) - URL to original source
  - `source_slug` - short identifier
  - `case_number` - optional
  - `decision_title` - optional
  - `court_name`, `court_level`, `decision_type` - dropdowns with appropriate values
  - `decision_date`, `publish_date` - date fields
  - `summary_text` - textarea
  - `keywords` - comma-separated
  - `language_code` - defaults to 'he'
  - `status` - PUBLISHED/DRAFT/ARCHIVED

- **File handling**: Now accepts **TXT only** (server requirement for indexing), max 50MB
- **Upload flow**:
  1. Create decision metadata → returns decision_id
  2. If file selected → upload text for indexing
  3. Text is automatically tokenized and indexed by server

### 4. Case Details Component ([case-details.ts](legal-cases-client/src/app/components/case-details/case-details.ts))

✅ **Changes**:
- **Removed**: Judge loading, Party loading, similar cases
- **Updated**: Uses `decision` instead of `legalCase`, `decisionId` instead of `caseId`
- **Added features**:
  - Word index display (top 100 by frequency)
  - Statistics display (lines, tokens, unique words)
  - Integrated search (word or phrase search with context)
  - Delete decision functionality
  - Files display (if present in decision.files[])

---

## Remaining Work

### 5. Search Page Component

**Current issues**:
- Expects global search endpoint (doesn't exist)
- Needs filters for court type, dates, etc. (not in server)

**Required changes**:
- Change to **decision-specific search**
- Add decision_id input field
- Two tabs: "חיפוש מילה" and "חיפוש ביטוי"
- Add context controls (before/after lines, max results)
- Display results with line numbers and context window
- Remove court filters, date filters, case number filters

### 6. Words Index Component

**Current issues**:
- May expect global word list (doesn't exist)

**Required changes**:
- Add decision_id input field (required)
- Display word_text and cnt columns
- Add sorting control (alpha/freq)
- Add limit control (default 1000)
- Update to use `getWordIndex(decisionId, order, limit)`

### 7. Legal Terms Groups Component

**Current issues**:
- Expects list all groups, edit group, remove words (not in server)

**Required changes**:
- **Simplify to**:
  - Create new group (name + description)
  - Add words to group (text input → split by comma → call `addWordsToGroup`)
  - View group index for a specific decision (decision_id + group_id input)
  - Display word samples with context
- **Remove**: List all groups, edit group, delete group, remove individual words

---

## Server Limitations & Missing Endpoints

The following would enhance functionality but require **server changes**:

### Useful endpoints not currently in server:
1. `GET /api/decisions` - List all decisions (with pagination)
2. `GET /api/groups` - List all word groups
3. `GET /api/groups/:id` - Get specific word group details
4. `DELETE /api/groups/:id/words/:word` - Remove word from group
5. `GET /api/words` - Global word list across all decisions
6. `GET /api/phrases` - CRUD for phrases (table exists but no API)

### Current limitations:
- **No listing**: Cannot list all decisions or word groups (must know IDs)
- **Search scope**: All searches are decision-specific (cannot search across all decisions)
- **No pagination**: Word index returns up to limit, no pagination support
- **No phrases API**: Phrases table exists in schema but has no endpoints
- **No judges/parties**: Not in server schema at all

---

## Testing Checklist

### Test Case Upload
1. ✅ Create decision with only source_url (minimum required)
2. ✅ Create decision with all optional fields populated
3. ✅ Upload TXT file → verify text is indexed
4. ✅ Verify returned decision_id

### Test Case Details
1. ✅ Load decision by ID
2. ✅ Display metadata (all fields)
3. ✅ Load and display text
4. ✅ Load word index (top 100 by frequency)
5. ✅ Load statistics
6. ✅ Perform word search with context
7. ✅ Perform phrase search with context
8. ✅ Delete decision

### Test Word Groups
1. ✅ Create word group
2. ✅ Add words to group (single, multiple)
3. ✅ Get group index for decision
4. ✅ Verify word samples with context

### Test Word Index
- Load index for decision (alpha sort)
- Load index for decision (freq sort)
- Verify correct columns (word_text, cnt)

---

## File Change Summary

| File | Status | Changes |
|------|--------|---------|
| `legal-case.model.ts` | ✅ Complete | Removed unused interfaces, updated to match server schema |
| `legal-cases.service.ts` | ✅ Complete | Removed unsupported methods, updated all endpoints to server API |
| `case-upload.ts` | ✅ Complete | Removed judges/parties, updated form to server fields |
| `case-upload.html` | ✅ Complete | New template matching server fields |
| `case-details.ts` | ✅ Complete | Removed judges/parties, added word search and statistics |
| `case-details.html` | ⏳ Pending | Needs template update for new features |
| `search-page.ts` | ⏳ Pending | Change to decision-specific search |
| `search-page.html` | ⏳ Pending | Update template for new search model |
| `words-index.ts` | ⏳ Pending | Add decision_id requirement |
| `words-index.html` | ⏳ Pending | Update template |
| `legal-terms-groups.ts` | ⏳ Pending | Simplify to create/add words/view index only |
| `legal-terms-groups.html` | ⏳ Pending | Update template |

---

## Quick Start Guide

### Server Setup
```bash
cd legal-cases-server
npm install
# Update MySQL credentials in index.js (lines 18-26)
npm run dev
# Server runs at http://localhost:3000
# Swagger docs at http://localhost:3000/api-docs
```

### Client Setup
```bash
cd legal-cases-client
npm install
npm start
# Client runs at http://localhost:4200
```

### First Upload
1. Go to Case Upload page
2. Enter source_url (e.g., "https://example.com/decision123")
3. Fill optional fields (title, case number, court name, etc.)
4. Upload a TXT file (optional but recommended for indexing)
5. Submit → Get decision_id in response
6. Go to Case Details with that ID to view/search

---

## API Documentation

Full API documentation available at: **http://localhost:3000/api-docs** (Swagger UI)

Key endpoints:
- **Decisions**: `/api/decisions/*`
- **Text Management**: `/api/decisions/:id/text`
- **Word Search**: `/api/decisions/:id/search/word`
- **Phrase Search**: `/api/decisions/:id/search/phrase`
- **Word Index**: `/api/decisions/:id/words`
- **Word Groups**: `/api/groups/*`
- **Statistics**: `/api/decisions/:id/stats`
