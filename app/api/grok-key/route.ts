import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GROK_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'Grok API key not configured' }, { status: 500 });
  }
  
  return NextResponse.json({ apiKey });
}
