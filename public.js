const SUPABASE_URL='https://thwxctipszzdvxjpegdm.supabase.co';const SUPABASE_KEY='sb_publishable_3W1TRYwdtncqHEBe8BjIUw_9sYl2Cce';
const sb=(await import('https://esm.sh/@supabase/supabase-js@2')).createClient(SUPABASE_URL,SUPABASE_KEY);
const gallery=document.querySelector('#gallery');
const {data,error}=await sb.from('cam_gallery').select('image_url,alt_text').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
if(error){gallery.innerHTML='<div class="gallery-empty">La galería estará disponible próximamente.</div>'}else if(!data?.length){gallery.innerHTML='<div class="gallery-empty">Próximamente vas a ver acá los trabajos de Las Uñas de Cam.</div>'}else{gallery.innerHTML=data.map(x=>`<figure class="gallery-item"><img loading="lazy" src="${x.image_url}" alt="${(x.alt_text||'Trabajo de uñas').replaceAll('"','&quot;')}"></figure>`).join('')}
