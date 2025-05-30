// Impor Deno standard library untuk melayani HTTP dan createClient dari Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tambahkan CORS headers untuk memungkinkan pemanggilan dari browser jika diperlukan (opsional untuk cron job)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Atau domain spesifik Anda
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tangani preflight request untuk CORS (opsional jika hanya untuk cron)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Buat Supabase client menggunakan environment variables
    // Pastikan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY telah di-set di environment variables Edge Function Anda
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hitung batas waktu (cutoff): 1 hari yang lalu dari sekarang
    const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    // Lakukan operasi delete ke tabel 'task'
    const { error, count } = await supabaseAdmin
      .from('task')
      .delete({ count: 'exact' }) // Meminta Supabase mengembalikan jumlah baris yang dihapus
      .eq('status', 'completed')   // Hanya task yang statusnya 'completed'
      .lt('completed_at', cutoff); // Hanya task yang completed_at nya lebih lama dari cutoff

    if (error) {
      console.error('Error auto-deleting completed tasks from server:', error.message);
      // Kembalikan response error
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const message = `Auto-deleted ${count ?? 0} old completed task(s) from server.`;
    console.log(message);
    // Kembalikan response sukses
    return new Response(JSON.stringify({ message: message, deleted_count: count ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('Unhandled error in Edge Function:', e.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: e.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});