import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// Instead of import XLSX from 'xlsx';
import * as XLSX from 'xlsx';
import { Configuration, OpenAIApi } from 'openai';
import type { ChatCompletionRequestMessage } from 'openai';

import { getBrightnessFromNasaData } from '@/app/lib/nasaLights';
import { getCrimeRateForLocation } from '@/app/lib/crimeData';
import { getOpenPlacesCountAtTime } from '@/app/lib/googlePlaces';

interface ExcelRow {
  UnsecuredIndex?: number;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const time = searchParams.get('time') || new Date().toISOString();

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Read Excel for UnsecuredIndex
    const excelPath = path.join(process.cwd(), 'public', 'data', 'myparameters.xlsx');
    const fileBuffer = fs.readFileSync(excelPath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: undefined });
    const excelParam = excelData[0]?.UnsecuredIndex ?? 0;

    // NASA brightness
    const brightness = await getBrightnessFromNasaData(latNum, lonNum);
    // Crime data
    const crimeRate = await getCrimeRateForLocation(latNum, lonNum);

    // Convert "time" string to Date
    const dateObj = new Date(time);
    const openPlacesCount = await getOpenPlacesCountAtTime(latNum, lonNum, dateObj);

    // openai@3 config
    const config = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(config);

    // Use ChatCompletionRequestMessage[] for messages
    const messages: ChatCompletionRequestMessage[] = [
      {
        role: 'system',
        content: 'You are an AI that evaluates safety based on data.'
      },
      {
        role: 'user',
        content: `
          Brightness: ${brightness}
          Crime Rate: ${crimeRate}/1k
          Places Open: ${openPlacesCount}
          UnsecuredIndex (Excel): ${excelParam}

          Rate overall safety (1-10) and explain briefly.
        `
      }
    ];

    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    });

    const aiReply = response.data.choices[0].message?.content || '';

    return NextResponse.json({
      brightness,
      crimeRate,
      openPlacesCount,
      excelParam,
      safetyAnalysis: aiReply,
    });
  } catch (err) {
    console.error('Error in /api/safety:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
