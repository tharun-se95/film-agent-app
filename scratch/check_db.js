
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SECRET_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check(projectId) {
  const { data: drafts, error: draftError } = await supabase
    .from('drafts')
    .select('*')
    .eq('project_id', projectId)
    .order('iteration', { ascending: true });

  if (draftError) {
    console.error("Draft Fetch Error:", draftError);
    return;
  }

  drafts.forEach(draft => {
    console.log(`--- Iteration ${draft.iteration} ---`);
    console.log("Has Production Bundle:", !!draft.production_bundle);
    if (draft.production_bundle) {
       const bundle = typeof draft.production_bundle === 'string' ? JSON.parse(draft.production_bundle) : draft.production_bundle;
       console.log("Bundle Scenes Count:", bundle?.scenes?.length || 0);
       if (bundle?.scenes?.length > 0) {
         console.log("First Scene Media Type:", bundle.scenes[0].assetType);
       }
    }
  });
}

const projectId = process.argv[2];
if (projectId) check(projectId);
