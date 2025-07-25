#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

interface CsvRow {
  date: string;
  rose: string;
  thorn: string;
  bud: string;
}

interface UploadResult {
  success: CsvRow[];
  errors: Array<{ row: CsvRow; error: string; line: number }>;
}

class BulkUploadService {
  private apiUrl: string;
  private authToken: string;

  constructor(authToken: string) {
    this.apiUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    this.authToken = authToken;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim());
    return result;
  }

  private validateDate(dateStr: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return false;
    }

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private validateAtLeastOneField(row: CsvRow): boolean {
    const hasRose = row.rose && row.rose.trim().length > 0;
    const hasThorn = row.thorn && row.thorn.trim().length > 0;
    const hasBud = row.bud && row.bud.trim().length > 0;
    return hasRose || hasThorn || hasBud;
  }

  private async validateToken(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or expired authentication token. Please log in again to get a fresh token.');
        }
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Token validation failed: ${String(error)}`);
    }
  }

  private async createEntry(entryData: CsvRow): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/entries`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: entryData.date,
        rose: entryData.rose || undefined,
        thorn: entryData.thorn || undefined,
        bud: entryData.bud || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 409) {
        throw new Error(`Entry already exists for date ${entryData.date}`);
      }
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
  }

  private parseCsv(filePath: string): CsvRow[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter((line) => line.trim().length > 0);

    // Skip header row if it exists
    const dataLines = lines[0].toLowerCase().includes('date') ? lines.slice(1) : lines;

    return dataLines.map((line) => {
      const fields = this.parseCsvLine(line);
      return {
        date: fields[0] || '',
        rose: fields[1] || '',
        thorn: fields[2] || '',
        bud: fields[3] || '',
      };
    });
  }

  async uploadEntries(filePath: string): Promise<UploadResult> {
    const result: UploadResult = {
      success: [],
      errors: [],
    };

    try {
      // Validate auth token
      await this.validateToken();

      // Parse CSV file
      const csvRows = this.parseCsv(filePath);

      // Process each row
      for (let i = 0; i < csvRows.length; i++) {
        const row = csvRows[i];
        const lineNumber = i + 2; // +2 because arrays are 0-indexed and we may have skipped header

        try {
          // Validate date format
          if (!this.validateDate(row.date)) {
            result.errors.push({
              row,
              error: `Invalid date format. Expected YYYY-MM-DD, got: ${row.date}`,
              line: lineNumber,
            });
            continue;
          }

          // Check at least one field has content
          if (!this.validateAtLeastOneField(row)) {
            result.errors.push({
              row,
              error: 'At least one field (rose, thorn, or bud) must have a value',
              line: lineNumber,
            });
            continue;
          }

          // Create entry via API
          await this.createEntry(row);
          result.success.push(row);
        } catch (error) {
          result.errors.push({
            row,
            error: error instanceof Error ? error.message : String(error),
            line: lineNumber,
          });
        }
      }
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: ts-node bulk_upload.ts <csv_file_path> <auth_token>');
    console.error('');
    console.error('Arguments:');
    console.error('  csv_file_path  Path to CSV file with columns: date,rose,thorn,bud');
    console.error('  auth_token     JWT authentication token');
    console.error('');
    console.error('CSV Format:');
    console.error('  - Date format: YYYY-MM-DD');
    console.error('  - At least one of rose, thorn, or bud must have content');
    console.error('  - Fields with commas should be quoted');
    process.exit(1);
  }

  const [csvFilePath, authToken] = args;

  // Validate file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Error: File not found: ${csvFilePath}`);
    process.exit(1);
  }

  // Load environment variables from backend directory
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

  const uploadService = new BulkUploadService(authToken);

  try {
    console.log('🔧 Validating authentication...');
    console.log(`📁 Processing CSV file: ${csvFilePath}`);

    const result = await uploadService.uploadEntries(csvFilePath);

    // Print results
    console.log('\n✅ SUCCESSFUL UPLOADS:');
    if (result.success.length === 0) {
      console.log('  None');
    } else {
      result.success.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.date} - Rose: "${row.rose}" Thorn: "${row.thorn}" Bud: "${row.bud}"`);
      });
    }

    console.log('\n❌ ERRORS:');
    if (result.errors.length === 0) {
      console.log('  None');
    } else {
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Line ${error.line}: ${error.error}`);
        console.log(`     Data: ${error.row.date} - Rose: "${error.row.rose}" Thorn: "${error.row.thorn}" Bud: "${error.row.bud}"`);
      });
    }

    console.log(`\n📊 SUMMARY: ${result.success.length} successful, ${result.errors.length} errors`);
  } catch (error) {
    console.error(`💥 Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
