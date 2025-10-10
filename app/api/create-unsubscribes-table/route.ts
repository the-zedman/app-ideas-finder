import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Return instructions for manual table creation
    const sql = `
-- Create the unsubscribes table
CREATE TABLE IF NOT EXISTS unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  unsubscribe_token UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the email column for faster lookups
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON unsubscribes(email);

-- Create an index on the unsubscribe_token column
CREATE INDEX IF NOT EXISTS idx_unsubscribes_token ON unsubscribes(unsubscribe_token);

-- Create an index on created_at for dashboard queries
CREATE INDEX IF NOT EXISTS idx_unsubscribes_created_at ON unsubscribes(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert unsubscribe records
CREATE POLICY "Allow public to insert unsubscribes" ON unsubscribes
  FOR INSERT WITH CHECK (true);

-- Create a policy that allows reading all unsubscribe records (for dashboard)
CREATE POLICY "Allow reading unsubscribes" ON unsubscribes
  FOR SELECT USING (true);
`;

    return NextResponse.json({ 
      success: true, 
      message: 'SQL commands to create unsubscribes table',
      sql: sql,
      instructions: 'Run these SQL commands in your Supabase SQL editor to create the unsubscribes table with proper RLS policies'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Unexpected error occurred' }, { status: 500 });
  }
}
