import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const country = searchParams.get('country') || 'us';

  if (!id) {
    return NextResponse.json({ error: 'App ID is required' }, { status: 400 });
  }

  try {
    const url = `https://itunes.apple.com/lookup?id=${id}&country=${country}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('iTunes lookup error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
