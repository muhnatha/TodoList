import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

    const { error, count } = await supabaseAdmin
      .from('task')
      .delete({ count: 'exact' }) 
      .eq('status', 'completed')  
      .lt('completed_at', cutoff); 

    if (error) {
      console.error('Error auto-deleting completed tasks from server:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const message = `Auto-deleted ${count ?? 0} old completed task(s) from server.`;
    console.log(message);
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