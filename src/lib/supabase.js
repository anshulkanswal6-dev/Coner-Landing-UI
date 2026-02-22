import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ccouamhbiofxtywlrxeq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjb3VhbWhiaW9meHR5d2xyeGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODYyNTUsImV4cCI6MjA4NzI2MjI1NX0.In8e410JfNx9oAQXkxVpzZEhLhtRHBIwYhulWB5q5ZM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
