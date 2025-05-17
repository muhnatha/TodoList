// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bxnlwlztwfkrijdpkioj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bmx3bHp0d2ZrcmlqZHBraW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0NDUzMzAsImV4cCI6MjA2MzAyMTMzMH0.iO3g0NBdWVVSx2cwASodv2PXik0M92MmUWlqsg1GDGI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
