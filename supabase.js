import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://odymelxqynvyoatqfypd.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9keW1lbHhxeW52eW9hdHFmeXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODUyNDMsImV4cCI6MjA3Mzk2MTI0M30.NbdF0T9A4-KS3ODn2axk2bsu8xfiZ13S8R29PhSEVyo";

export const supabase = createClient(supabaseUrl, supabaseKey);
