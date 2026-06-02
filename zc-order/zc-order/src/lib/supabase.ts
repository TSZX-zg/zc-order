import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gondtjozadicmyczzcmo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbmR0am96YWRpY215Y3p6Y21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzQzMzYsImV4cCI6MjA5NTU1MDMzNn0.IemBcvhvgvue85ro9NEniZAgsy3y2FD3vwcYaEqlylc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL = supabaseUrl;
export const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/send-order-email`;
