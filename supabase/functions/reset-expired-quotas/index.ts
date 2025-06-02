import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FREE_NOTES_QUOTA_BASE = 3;
const FREE_TODOS_QUOTA_BASE = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

async function recalculateAndSaveUserQuota(supabaseAdmin, userId, packageType) {
  console.log(`Recalculating ${packageType} quota for user ${userId}...`);
  const baseFreeQuota = packageType === 'notes' ? FREE_NOTES_QUOTA_BASE : FREE_TODOS_QUOTA_BASE;
  const { data: activePackages, error: fetchActiveError } = await supabaseAdmin.from('quota_packages').select('items_added').eq('user_id', userId).eq('package_type', packageType).eq('is_active', true);
  let currentTotalQuota = baseFreeQuota;
  if (fetchActiveError) {
    console.error(`Error fetching active ${packageType} packages for user ${userId}:`, fetchActiveError.message);
  } else if (activePackages && activePackages.length > 0) {
    const totalPaidQuota = activePackages.reduce((sum, pkg)=>sum + (pkg.items_added || 0), 0);
    currentTotalQuota = baseFreeQuota + totalPaidQuota;
  }
  const columnToUpdate = packageType === 'notes' ? 'notes_current_total_quota' : 'todos_current_total_quota';
  const { error: updateProfileError } = await supabaseAdmin.from('profiles').update({
    [columnToUpdate]: currentTotalQuota,
    updated_at: new Date().toISOString()
  }).eq('id', userId);
  if (updateProfileError) {
    console.warn(`Could not update ${columnToUpdate} in profiles for user ${userId} from server:`, updateProfileError.message);
  } else {
    console.log(`Successfully updated ${columnToUpdate} for user ${userId} to ${currentTotalQuota} from server.`);
  }
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const now = new Date().toISOString();
    console.log(`Cron job 'reset-expired-quotas' started at: ${now}`);

    const { data: expiredPackages, error: fetchExpiredError } = await supabaseAdmin.from('quota_packages').select('id, user_id, package_type') 
    .eq('is_active', true).lte('expires_at', now);
    if (fetchExpiredError) {
      console.error("Error fetching expired packages:", fetchExpiredError.message);
      return new Response(JSON.stringify({
        error: "Error fetching expired packages",
        details: fetchExpiredError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!expiredPackages || expiredPackages.length === 0) {
      console.log("No expired packages found to process.");
      return new Response(JSON.stringify({
        message: "No expired packages found to process."
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    console.log(`Found ${expiredPackages.length} expired package(s). Processing...`);
    const packageIdsToDeactivate = expiredPackages.map((pkg)=>pkg.id);
    const { count: deactivatedCount, error: deactivateError } = await supabaseAdmin.from('quota_packages').update({
      is_active: false
    }).in('id', packageIdsToDeactivate);
    if (deactivateError) {
      console.error("Error deactivating expired packages:", deactivateError.message);
    } else {
      console.log(`Successfully deactivated ${deactivatedCount ?? 0} package(s).`);
    }
    const affectedUsers = new Map();
    for (const pkg of expiredPackages){
      if (!affectedUsers.has(pkg.user_id)) {
        affectedUsers.set(pkg.user_id, new Set());
      }
      if (pkg.package_type === 'todos' || pkg.package_type === 'notes') {
        affectedUsers.get(pkg.user_id).add(pkg.package_type);
      }
    }
    console.log(`Recalculating quotas for ${affectedUsers.size} affected user(s)...`);
    for (const [userId, packageTypes] of affectedUsers){
      for (const type of packageTypes){
        await recalculateAndSaveUserQuota(supabaseAdmin, userId, type);
      }
    }
    const message = `Processed expired packages. Deactivated: ${deactivatedCount ?? 0}. Recalculated quotas for ${affectedUsers.size} user(s).`;
    console.log(message);
    return new Response(JSON.stringify({
      message: message,
      deactivated_count: deactivatedCount ?? 0,
      users_recalculated: affectedUsers.size
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (e) {
    console.error('Unhandled error in Edge Function reset-expired-quotas:', e.message);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      details: e.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});