const SUPABASE_URL =
  'https://thwxctipszzdvxjpegdm.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_3W1TRYwdtncqHEBe8BjIUw_9sYl2Cce';

const sb =
  (await import(
    'https://esm.sh/@supabase/supabase-js@2'
  )).createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const gallery =
  document.querySelector('#gallery');

const services =
  document.querySelector('#services');


const esc =
  s =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');


const [
  { data: g, error: ge },
  { data: sv, error: se },
  { data: settings }
] =
  await Promise.all([

    sb
      .from('cam_gallery')
      .select(
        'image_url,alt_text'
      )
      .order(
        'sort_order',
        {
          ascending: true
        }
      )
      .order(
        'created_at',
        {
          ascending: false
        }
      ),

    sb
      .from('cam_services')
      .select(
        'id,name,description,image_url,sort_order'
      )
      .order(
        'sort_order',
        {
          ascending: true
        }
      ),

    sb
      .from('cam_site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

  ]);


/* =========================
   GALERÍA
========================= */

if (ge) {

  gallery.innerHTML =
    '<div class="gallery-empty">La galería estará disponible próximamente.</div>';

} else if (!g?.length) {

  gallery.innerHTML =
    '<div class="gallery-empty">Próximamente vas a ver acá los trabajos de lasuniasdecam.</div>';

} else {

  gallery.innerHTML =
    g
      .map(
        x => `
          <figure class="gallery-item">

            <img
              loading="lazy"
              src="${esc(x.image_url)}"
              alt="${esc(
                x.alt_text ||
                'Trabajo de uñas'
              )}"
            >

          </figure>
        `
      )
      .join('');

}


/* =========================
   SERVICIOS
========================= */

if (se) {

  services.innerHTML =
    '<div class="service-empty">Los servicios estarán disponibles próximamente.</div>';

} else {

  services.innerHTML =
    (sv || [])
      .map(
        (x, i) => `

          <article
            class="service-card ${
              x.image_url
                ? 'has-image'
                : ''
            }"
          >

            ${
              x.image_url
                ? `
                  <div class="service-image">

                    <img
                      loading="lazy"
                      src="${esc(
                        x.image_url
                      )}"
                      alt="${esc(
                        x.name
                      )}"
                    >

                  </div>
                `
                : ''
            }

            <div class="service-copy">

              <span>
                ${String(i + 1).padStart(2, '0')}
              </span>

              <h3>
                ${esc(x.name)}
              </h3>

              <p>
                ${esc(
                  x.description || ''
                )}
              </p>

            </div>

          </article>

        `
      )
      .join('');

}


/* =========================
   DATOS DEL SITIO
========================= */

if (settings) {

  const ig =
    settings.instagram_url ||
    'https://www.instagram.com/lasuniasdecam/';


  document
    .querySelectorAll(
      'a[href*="instagram.com/lasuniasdecam"]'
    )
    .forEach(
      a => {
        a.href = ig;
      }
    );


  if (settings.location) {

    const location =
      document.querySelector(
        '#location'
      );

    if (location) {

      location.textContent =
        '♡ ' +
        settings.location;

    }

  }


  if (settings.phone || ig) {

    const contact =
      document.querySelector(
        '#contact'
      );

    if (contact) {

      contact.textContent =
        `Instagram · @lasuniasdecam${
          settings.phone
            ? '   ·   ' +
              settings.phone
            : ''
        }`;

    }

  }


  /* =========================
     IMAGEN CARTEL SUPERIOR
  ========================= */

  const heroImage =
    document.querySelector(
      '#heroImage'
    );

  const heroCard =
    document.querySelector(
      '#heroCard'
    );

  const heroCardContent =
    document.querySelector(
      '#heroCardContent'
    );


  if (
    heroImage &&
    heroCard &&
    settings.hero_image_url
  ) {

    heroImage.src =
      settings.hero_image_url;

    heroImage.style.display =
      'block';

    heroImage.style.width =
      '100%';

    heroImage.style.height =
      '100%';

    heroImage.style.objectFit =
      'cover';

    heroImage.style.position =
      'absolute';

    heroImage.style.inset =
      '0';

    heroImage.style.borderRadius =
      'inherit';


    heroCard.style.position =
      'relative';

    heroCard.style.overflow =
      'hidden';


    if (heroCardContent) {

      heroCardContent.style.position =
        'relative';

      heroCardContent.style.zIndex =
        '2';

    }

  }


  /* =========================
     IMAGEN DETALLE
  ========================= */

  const detailImage =
    document.querySelector(
      '#detailImage'
    );

  const detailCard =
    document.querySelector(
      '#detailCard'
    );

  const detailCardContent =
    document.querySelector(
      '#detailCardContent'
    );


  if (
    detailImage &&
    detailCard &&
    settings.detail_image_url
  ) {

    detailImage.src =
      settings.detail_image_url;

    detailImage.style.display =
      'block';

    detailImage.style.width =
      '100%';

    detailImage.style.height =
      '100%';

    detailImage.style.objectFit =
      'cover';

    detailImage.style.position =
      'absolute';

    detailImage.style.inset =
      '0';

    detailImage.style.borderRadius =
      'inherit';


    detailCard.style.position =
      'relative';

    detailCard.style.overflow =
      'hidden';


    if (detailCardContent) {

      detailCardContent.style.position =
        'relative';

      detailCardContent.style.zIndex =
        '2';

    }

  }

}
