// File: /app/api/excelParam/route.ts

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

interface ExcelRow {
  UnsecuredIndex?: number;
}

export async function GET() {
  try {
    const excelPath = path.join(process.cwd(), 'public', 'data', 'myparameters.xlsx');
    const fileBuffer = fs.readFileSync(excelPath);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: undefined });

    const myParam = jsonData[0]?.UnsecuredIndex ?? 0;
    return NextResponse.json({ myParam });
  } catch (error: unknown) {
    console.error('Error parsing Excel:', error);
    return new NextResponse(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500 }
    );
  }
}
