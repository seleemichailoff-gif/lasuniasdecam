const SUPABASE_URL = 'https://thwxctipszzdvxjpegdm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3W1TRYwdtncqHEBe8BjIUw_9sYl2Cce';

const { createClient } = await import(
  'https://esm.sh/@supabase/supabase-js@2'
);

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (selector) => document.querySelector(selector);

const login = $('#login');
const panel = $('#panel');
const msg = $('#loginMsg');

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

async function getCurrentSession() {
  const { data, error } = await sb.auth.getSession();

  if (error) {
    console.error('Error obteniendo sesión:', error);
    return null;
  }

  return data?.session ?? null;
}

async function isAdmin() {
  const session = await getCurrentSession();

  if (!session?.user?.email) {
    return false;
  }

  const { data: admin, error } = await sb
    .from('admin_users')
    .select('email')
    .ilike('email', session.user.email)
    .maybeSingle();

  if (error) {
    console.error('Error comprobando administrador:', error);
    throw new Error(
      `No se pudo comprobar el administrador: ${error.message}`
    );
  }

  return !!admin;
}

async function load() {
  try {
    const admin = await isAdmin();

    if (admin) {
      login.classList.add('hidden');
      panel.classList.remove('hidden');
      await refresh();
    } else {
      await sb.auth.signOut();

      login.classList.remove('hidden');
      panel.classList.add('hidden');

      if (msg) {
        msg.textContent =
          'El usuario inició sesión, pero no tiene permisos de administrador.';
      }
    }
  } catch (error) {
    console.error('Error cargando panel:', error);

    login.classList.remove('hidden');
    panel.classList.add('hidden');

    if (msg) {
      msg.textContent =
        error?.message ||
        'No se pudo comprobar el acceso al panel.';
    }
  }
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = $('#email').value.trim();
  const password = $('#password').value;

  msg.textContent = 'Ingresando…';

  try {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    console.log('Resultado login:', {
      user: data?.user?.email ?? null,
      session: !!data?.session,
      error
    });

    if (error) {
      console.error('Error de Supabase Auth:', error);

      msg.textContent =
        error.message ||
        'No se pudo iniciar sesión.';

      return;
    }

    if (!data?.session) {
      msg.textContent =
        'Supabase autenticó la cuenta pero no creó una sesión.';
      return;
    }

    msg.textContent = 'Acceso correcto. Cargando panel…';

    await load();

  } catch (error) {
    console.error('Error inesperado en login:', error);

    msg.textContent =
      error?.message ||
      'Ocurrió un error inesperado al iniciar sesión.';
  }
});

$('#logout').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.reload();
});

async function uploadImage(file, path) {
  const up = await sb.storage
    .from('cam-gallery')
    .upload(path, file, {
      cacheControl: '31536000',
      upsert: true,
      contentType: file.type
    });

  if (up.error) {
    throw up.error;
  }

  return sb.storage
    .from('cam-gallery')
    .getPublicUrl(path)
    .data.publicUrl;
}

async function refresh() {
  const { data, error } = await sb
    .from('cam_gallery')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  $('#adminGallery').innerHTML =
    (data || [])
      .map(
        (x) => `
          <div class="admin-item" data-id="${esc(x.id)}">
            <img src="${esc(x.image_url)}" alt="">
            <button class="delete" title="Eliminar">×</button>
          </div>
        `
      )
      .join('') ||
    '<p class="muted">Todavía no hay fotos.</p>';

  document
    .querySelectorAll('.admin-grid .delete')
    .forEach((button) => {
      button.onclick = async () => {
        const id = button.parentElement.dataset.id;
        const item = data.find((x) => x.id === id);

        if (!item) return;

        if (!confirm('¿Eliminar esta foto?')) return;

        try {
          if (item.storage_path) {
            await sb.storage
              .from('cam-gallery')
              .remove([item.storage_path]);
          }

          const { error } = await sb
            .from('cam_gallery')
            .delete()
            .eq('id', id);

          if (error) throw error;

          await refresh();
        } catch (error) {
          alert(
            error?.message ||
            'No se pudo eliminar la foto.'
          );
        }
      };
    });

  const { data: settings, error: settingsError } = await sb
    .from('cam_site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (settingsError) {
    throw settingsError;
  }

  if (settings) {
    $('#instagram').value = settings.instagram_url || '';
    $('#phone').value = settings.phone || '';
    $('#location').value = settings.location || '';
  }

  const { data: services, error: servicesError } = await sb
    .from('cam_services')
    .select('*')
    .order('sort_order', { ascending: true });

  if (servicesError) {
    throw servicesError;
  }

  $('#servicesAdmin').innerHTML =
    (services || [])
      .map(
        (x) => `
          <article
            class="service-admin-card"
            data-id="${esc(x.id)}"
          >
            <div class="service-admin-image">
              ${
                x.image_url
                  ? `<img src="${esc(x.image_url)}" alt="${esc(x.name)}">`
                  : '<span>＋</span>'
              }
            </div>

            <div>
              <p class="eyebrow">SERVICIO</p>

              <h3>${esc(x.name)}</h3>

              <p class="muted">
                ${esc(x.description || '')}
              </p>

              <label class="mini-upload">
                <input
                  class="service-file"
                  type="file"
                  accept="image/*"
                >
                ${x.image_url ? 'Cambiar foto' : 'Subir foto'}
              </label>

              ${
                x.image_url
                  ? '<button class="text-delete service-delete" type="button">Eliminar foto</button>'
                  : ''
              }

              <p class="form-msg service-msg"></p>
            </div>
          </article>
        `
      )
      .join('');

  document
    .querySelectorAll('.service-file')
    .forEach((input) => {
      input.onchange = async () => {
        const card = input.closest('.service-admin-card');
        const id = card.dataset.id;
        const file = input.files[0];

        if (!file) return;

        const service = services.find((x) => x.id === id);
        const serviceMsg = card.querySelector('.service-msg');

        serviceMsg.textContent = 'Subiendo…';

        try {
          if (service.storage_path) {
            await sb.storage
              .from('cam-gallery')
              .remove([service.storage_path]);
          }

          const extension =
            file.name.split('.').pop().toLowerCase();

          const path = `services/${id}.${extension}`;

          const url = await uploadImage(file, path);

          const { error } = await sb
            .from('cam_services')
            .update({
              image_url: url,
              storage_path: path,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          await refresh();

        } catch (error) {
          console.error(
            'Error subiendo imagen de servicio:',
            error
          );

          serviceMsg.textContent =
            error?.message ||
            'No se pudo subir la foto.';
        }
      };
    });

  document
    .querySelectorAll('.service-delete')
    .forEach((button) => {
      button.onclick = async () => {
        const card = button.closest('.service-admin-card');
        const id = card.dataset.id;

        const service = services.find(
          (x) => x.id === id
        );

        if (!service) return;

        if (
          !confirm(
            '¿Eliminar la foto de este servicio?'
          )
        ) {
          return;
        }

        try {
          if (service.storage_path) {
            await sb.storage
              .from('cam-gallery')
              .remove([service.storage_path]);
          }

          const { error } = await sb
            .from('cam_services')
            .update({
              image_url: null,
              storage_path: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);

          if (error) throw error;

          await refresh();

        } catch (error) {
          alert(
            error?.message ||
            'No se pudo eliminar la foto.'
          );
        }
      };
    });
}

$('#files').addEventListener('change', async (e) => {
  const files = [...e.target.files];

  for (const file of files) {
    try {
      const extension =
        file.name.split('.').pop().toLowerCase();

      const path =
        `gallery/${crypto.randomUUID()}.${extension}`;

      const url = await uploadImage(file, path);

      const { count, error: countError } = await sb
        .from('cam_gallery')
        .select('*', {
          count: 'exact',
          head: true
        });

      if (countError) throw countError;

      const { error } = await sb
        .from('cam_gallery')
        .insert({
          image_url: url,
          storage_path: path,
          sort_order: (count || 0) + 1,
          alt_text: 'Trabajo de uñas de lasuniasdecam'
        });

      if (error) throw error;

    } catch (error) {
      console.error(
        'Error subiendo foto:',
        error
      );

      alert(
        error?.message ||
        'No se pudo subir una foto.'
      );
    }
  }

  e.target.value = '';

  await refresh();
});

$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const { error } = await sb
    .from('cam_site_settings')
    .update({
      instagram_url: $('#instagram').value.trim(),
      phone: $('#phone').value.trim(),
      location: $('#location').value.trim(),
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);

  $('#settingsMsg').textContent =
    error
      ? error.message
      : 'Cambios guardados.';
});

await load();
