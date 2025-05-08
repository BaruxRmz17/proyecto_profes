import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtmziyuzknekoqwxoyqs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bXppeXV6a25la29xd3hveXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MTgyMjksImV4cCI6MjA2MjI5NDIyOX0.lCPBnDtx9ucMLVMk2Fha03nE3APgrzY8oZXZn2rz2YM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
