const SUPABASE_URL =
  'https://thwxctipszzdvxjpegdm.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_3W1TRYwdtncqHEBe8BjIUw_9sYl2Cce';

const SITE_URL =
  'https://lasuniasdecam.vercel.app';

const { createClient } = await import(
  'https://esm.sh/@supabase/supabase-js@2'
);

const sb = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const $ = (selector) =>
  document.querySelector(selector);

const login = $('#login');
const panel = $('#panel');
const msg = $('#loginMsg');

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');


/* =========================
   ADMIN CHECK
========================= */

async function isAdmin() {

  const {
    data: { session },
    error: sessionError
  } = await sb.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user?.email) {
    return false;
  }

  const {
    data: admin,
    error
  } = await sb
    .from('admin_users')
    .select('email')
    .ilike(
      'email',
      session.user.email
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!admin;
}


/* =========================
   LOAD PANEL
========================= */

async function load() {

  try {

    const admin = await isAdmin();

    if (!admin) {

      await sb.auth.signOut();

      login.classList.remove('hidden');
      panel.classList.add('hidden');

      msg.textContent =
        'La cuenta inició sesión, pero no tiene permisos de administrador.';

      return;
    }

    login.classList.add('hidden');
    panel.classList.remove('hidden');

    await refresh();

  } catch (error) {

    console.error(
      'Error cargando panel:',
      error
    );

    login.classList.remove('hidden');
    panel.classList.add('hidden');

    msg.textContent =
      error?.message ||
      'No se pudo cargar el panel.';

  }
}


/* =========================
   LOGIN
========================= */

$('#loginForm').addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    msg.textContent =
      'Ingresando…';

    const email =
      $('#email').value.trim();

    const password =
      $('#password').value;

    try {

      const {
        data,
        error
      } = await sb.auth.signInWithPassword({
        email,
        password
      });

      if (error) {

        console.error(
          'Error Auth:',
          error
        );

        msg.textContent =
          error.message ||
          'No se pudo iniciar sesión.';

        return;
      }

      if (!data?.session) {

        msg.textContent =
          'No se pudo crear la sesión.';

        return;
      }

      msg.textContent =
        'Acceso correcto. Cargando…';

      await load();

    } catch (error) {

      console.error(
        'Error inesperado:',
        error
      );

      msg.textContent =
        error?.message ||
        'Ocurrió un error inesperado.';

    }

  }
);


/* =========================
   RECUPERAR CONTRASEÑA
========================= */

$('#forgotPassword').addEventListener(
  'click',
  async () => {

    const email =
      $('#email').value.trim();

    if (!email) {

      msg.textContent =
        'Primero escribí tu email.';

      $('#email').focus();

      return;
    }

    msg.textContent =
      'Enviando correo de recuperación…';

    try {

      const {
        error
      } = await sb.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${SITE_URL}/admin.html`
        }
      );

      if (error) {
        throw error;
      }

      msg.textContent =
        'Listo. Revisá tu correo para cambiar la contraseña.';

    } catch (error) {

      console.error(
        'Error recuperación:',
        error
      );

      msg.textContent =
        error?.message ||
        'No se pudo enviar el correo.';

    }

  }
);


/* =========================
   PASSWORD RECOVERY
========================= */

sb.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === 'PASSWORD_RECOVERY' &&
      session
    ) {

      const newPassword =
        prompt(
          'Escribí tu nueva contraseña:'
        );

      if (!newPassword) {
        return;
      }

      if (newPassword.length < 6) {

        alert(
          'La contraseña debe tener al menos 6 caracteres.'
        );

        return;
      }

      try {

        const {
          error
        } = await sb.auth.updateUser({
          password: newPassword
        });

        if (error) {
          throw error;
        }

        alert(
          'Contraseña actualizada correctamente.'
        );

        await load();

      } catch (error) {

        console.error(
          'Error cambiando contraseña:',
          error
        );

        alert(
          error?.message ||
          'No se pudo cambiar la contraseña.'
        );

      }

    }

  }
);


/* =========================
   LOGOUT
========================= */

$('#logout').addEventListener(
  'click',
  async () => {

    await sb.auth.signOut();

    location.reload();

  }
);


/* =========================
   UPLOAD STORAGE
========================= */

async function uploadImage(
  file,
  path
) {

  const {
    error
  } = await sb.storage
    .from('cam-gallery')
    .upload(
      path,
      file,
      {
        cacheControl: '31536000',
        upsert: true,
        contentType: file.type
      }
    );

  if (error) {
    throw error;
  }

  return sb.storage
    .from('cam-gallery')
    .getPublicUrl(path)
    .data.publicUrl;
}


/* =========================
   REFRESH PANEL
========================= */

async function refresh() {

  /* =========================
     GALERÍA
  ========================= */

  const {
    data,
    error
  } = await sb
    .from('cam_gallery')
    .select('*')
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
    );

  if (error) {
    throw error;
  }

  $('#adminGallery').innerHTML =
    (data || [])
      .map(
        (x) => `
          <div
            class="admin-item"
            data-id="${esc(x.id)}"
          >

            <img
              src="${esc(x.image_url)}"
              alt=""
            >

            <button
              class="delete"
              title="Eliminar"
            >
              ×
            </button>

          </div>
        `
      )
      .join('') ||
      '<p class="muted">Todavía no hay fotos.</p>';


  document
    .querySelectorAll(
      '.admin-grid .delete'
    )
    .forEach(
      (button) => {

        button.onclick =
          async () => {

            const id =
              button.parentElement
                .dataset.id;

            const item =
              data.find(
                (x) => x.id === id
              );

            if (!item) {
              return;
            }

            if (
              !confirm(
                '¿Eliminar esta foto?'
              )
            ) {
              return;
            }

            try {

              if (item.storage_path) {

                await sb.storage
                  .from('cam-gallery')
                  .remove([
                    item.storage_path
                  ]);

              }

              const {
                error
              } = await sb
                .from('cam_gallery')
                .delete()
                .eq('id', id);

              if (error) {
                throw error;
              }

              await refresh();

            } catch (error) {

              alert(
                error?.message ||
                'No se pudo eliminar la foto.'
              );

            }

          };

      }
    );


  /* =========================
     DATOS DEL SITIO
  ========================= */

  const {
    data: settings,
    error: settingsError
  } = await sb
    .from('cam_site_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (settingsError) {
    throw settingsError;
  }

  if (settings) {

    $('#instagram').value =
      settings.instagram_url || '';

    $('#phone').value =
      settings.phone || '';

    $('#location').value =
      settings.location || '';

  }


  /* =========================
     IMÁGENES DESTACADAS
  ========================= */

  $('#featuredImagesAdmin').innerHTML = `

    <div class="featured-admin-grid">

      <article class="featured-admin-card">

        <div class="featured-admin-preview">

          ${
            settings?.hero_image_url
              ? `
                <img
                  src="${esc(settings.hero_image_url)}"
                  alt="Imagen superior"
                >
              `
              : `
                <div class="featured-admin-empty">
                  <span>＋</span>
                  <small>Sin imagen</small>
                </div>
              `
          }

        </div>

        <div class="featured-admin-content">

          <p class="eyebrow">
            CARTEL SUPERIOR
          </p>

          <h3>
            Lasuniasdecam · Manicura · Nails
          </h3>

          <p class="muted">
            Imagen del cartel de la parte superior.
          </p>

          <label class="mini-upload">

            <input
              id="heroImageFile"
              type="file"
              accept="image/*"
            >

            ${
              settings?.hero_image_url
                ? 'Cambiar foto'
                : 'Subir foto'
            }

          </label>

          ${
            settings?.hero_image_url
              ? `
                <button
                  id="deleteHeroImage"
                  class="text-delete"
                  type="button"
                >
                  Eliminar foto
                </button>
              `
              : ''
          }

          <p
            id="heroImageMsg"
            class="form-msg"
          ></p>

        </div>

      </article>


      <article class="featured-admin-card">

        <div class="featured-admin-preview">

          ${
            settings?.detail_image_url
              ? `
                <img
                  src="${esc(settings.detail_image_url)}"
                  alt="Imagen detalle"
                >
              `
              : `
                <div class="featured-admin-empty">
                  <span>＋</span>
                  <small>Sin imagen</small>
                </div>
              `
          }

        </div>

        <div class="featured-admin-content">

          <p class="eyebrow">
            DETALLE
          </p>

          <h3>
            Imagen del bloque Detalle
          </h3>

          <p class="muted">
            Imagen del bloque inferior de detalle.
          </p>

          <label class="mini-upload">

            <input
              id="detailImageFile"
              type="file"
              accept="image/*"
            >

            ${
              settings?.detail_image_url
                ? 'Cambiar foto'
                : 'Subir foto'
            }

          </label>

          ${
            settings?.detail_image_url
              ? `
                <button
                  id="deleteDetailImage"
                  class="text-delete"
                  type="button"
                >
                  Eliminar foto
                </button>
              `
              : ''
          }

          <p
            id="detailImageMsg"
            class="form-msg"
          ></p>

        </div>

      </article>

    </div>
  `;


  /* =========================
     SUBIR FOTO SUPERIOR
  ========================= */

  $('#heroImageFile').onchange =
    async () => {

      const file =
        $('#heroImageFile').files[0];

      if (!file) {
        return;
      }

      const imageMsg =
        $('#heroImageMsg');

      imageMsg.textContent =
        'Subiendo…';

      try {

        if (settings?.hero_storage_path) {

          await sb.storage
            .from('cam-gallery')
            .remove([
              settings.hero_storage_path
            ]);

        }

        const extension =
          file.name
            .split('.')
            .pop()
            .toLowerCase();

        const path =
          `featured/hero.${extension}`;

        const url =
          await uploadImage(
            file,
            path
          );

        const {
          error
        } = await sb
          .from('cam_site_settings')
          .update({
            hero_image_url: url,
            hero_storage_path: path,
            updated_at:
              new Date().toISOString()
          })
          .eq('id', 1);

        if (error) {
          throw error;
        }

        await refresh();

      } catch (error) {

        console.error(
          'Error imagen superior:',
          error
        );

        imageMsg.textContent =
          error?.message ||
          'No se pudo subir la foto.';

      }

    };


  /* =========================
     SUBIR FOTO DETALLE
  ========================= */

  $('#detailImageFile').onchange =
    async () => {

      const file =
        $('#detailImageFile').files[0];

      if (!file) {
        return;
      }

      const imageMsg =
        $('#detailImageMsg');

      imageMsg.textContent =
        'Subiendo…';

      try {

        if (settings?.detail_storage_path) {

          await sb.storage
            .from('cam-gallery')
            .remove([
              settings.detail_storage_path
            ]);

        }

        const extension =
          file.name
            .split('.')
            .pop()
            .toLowerCase();

        const path =
          `featured/detail.${extension}`;

        const url =
          await uploadImage(
            file,
            path
          );

        const {
          error
        } = await sb
          .from('cam_site_settings')
          .update({
            detail_image_url: url,
            detail_storage_path: path,
            updated_at:
              new Date().toISOString()
          })
          .eq('id', 1);

        if (error) {
          throw error;
        }

        await refresh();

      } catch (error) {

        console.error(
          'Error imagen detalle:',
          error
        );

        imageMsg.textContent =
          error?.message ||
          'No se pudo subir la foto.';

      }

    };


  /* =========================
     ELIMINAR FOTO SUPERIOR
  ========================= */

  $('#deleteHeroImage')?.addEventListener(
    'click',
    async () => {

      if (
        !confirm(
          '¿Eliminar la imagen del cartel superior?'
        )
      ) {
        return;
      }

      try {

        if (settings?.hero_storage_path) {

          await sb.storage
            .from('cam-gallery')
            .remove([
              settings.hero_storage_path
            ]);

        }

        const {
          error
        } = await sb
          .from('cam_site_settings')
          .update({
            hero_image_url: null,
            hero_storage_path: null,
            updated_at:
              new Date().toISOString()
          })
          .eq('id', 1);

        if (error) {
          throw error;
        }

        await refresh();

      } catch (error) {

        alert(
          error?.message ||
          'No se pudo eliminar la foto.'
        );

      }

    }
  );


  /* =========================
     ELIMINAR FOTO DETALLE
  ========================= */

  $('#deleteDetailImage')?.addEventListener(
    'click',
    async () => {

      if (
        !confirm(
          '¿Eliminar la imagen del bloque Detalle?'
        )
      ) {
        return;
      }

      try {

        if (settings?.detail_storage_path) {

          await sb.storage
            .from('cam-gallery')
            .remove([
              settings.detail_storage_path
            ]);

        }

        const {
          error
        } = await sb
          .from('cam_site_settings')
          .update({
            detail_image_url: null,
            detail_storage_path: null,
            updated_at:
              new Date().toISOString()
          })
          .eq('id', 1);

        if (error) {
          throw error;
        }

        await refresh();

      } catch (error) {

        alert(
          error?.message ||
          'No se pudo eliminar la foto.'
        );

      }

    }
  );


  /* =========================
     SERVICIOS
  ========================= */

  const {
    data: services,
    error: servicesError
  } = await sb
    .from('cam_services')
    .select('*')
    .order(
      'sort_order',
      {
        ascending: true
      }
    );

  if (servicesError) {
    throw servicesError;
  }


  $('#servicesAdmin').innerHTML =
    (services || [])
      .map(
        (x) => {

          return `
            <article
              class="service-admin-card"
              data-id="${esc(x.id)}"
            >

              <div class="service-admin-image">

                ${
                  x.image_url
                    ? `
                      <img
                        src="${esc(x.image_url)}"
                        alt="${esc(x.name)}"
                      >
                    `
                    : '<span>＋</span>'
                }

              </div>


              <div>

                <p class="eyebrow">
                  SERVICIO
                </p>

                <h3>
                  ${esc(x.name)}
                </h3>

                <p class="muted">
                  ${esc(x.description || '')}
                </p>


                <label class="mini-upload">

                  <input
                    class="service-file"
                    type="file"
                    accept="image/*"
                  >

                  ${
                    x.image_url
                      ? 'Cambiar foto'
                      : 'Subir foto'
                  }

                </label>


                ${
                  x.image_url
                    ? `
                      <button
                        class="service-adjust"
                        type="button"
                      >
                        Ajustar foto
                      </button>

                      <button
                        class="text-delete service-delete"
                        type="button"
                      >
                        Eliminar foto
                      </button>
                    `
                    : ''
                }


                <div
                  class="service-crop-editor"
                  hidden
                >

                  <div class="service-crop-preview">

                    <img
                      src="${esc(x.image_url || '')}"
                      alt=""
                    >

                  </div>


                  <div class="service-crop-tools">

                    <div class="service-crop-title">
                      <strong>Ajustar encuadre</strong>

                      <button
                        class="service-close-adjust"
                        type="button"
                      >
                        Cerrar
                      </button>
                    </div>


                    <label class="crop-control">

                      <span>
                        Zoom
                        <output class="zoom-value">
                          ${Number(
                            x.image_zoom ?? 1
                          ).toFixed(2)}×
                        </output>
                      </span>

                      <input
                        class="service-zoom"
                        type="range"
                        min="1"
                        max="2.5"
                        step="0.01"
                        value="${Number(
                          x.image_zoom ?? 1
                        )}"
                      >

                    </label>


                    <label class="crop-control">

                      <span>
                        Horizontal
                        <output class="x-value">
                          ${Math.round(
                            Number(
                              x.image_position_x ?? 50
                            )
                          )}%
                        </output>
                      </span>

                      <input
                        class="service-x"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value="${Number(
                          x.image_position_x ?? 50
                        )}"
                      >

                    </label>


                    <label class="crop-control">

                      <span>
                        Vertical
                        <output class="y-value">
                          ${Math.round(
                            Number(
                              x.image_position_y ?? 50
                            )
                          )}%
                        </output>
                      </span>

                      <input
                        class="service-y"
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value="${Number(
                          x.image_position_y ?? 50
                        )}"
                      >

                    </label>


                    <div class="service-crop-actions">

                      <button
                        class="service-reset-crop"
                        type="button"
                      >
                        Restablecer
                      </button>

                      <button
                        class="service-save-crop"
                        type="button"
                      >
                        Guardar encuadre
                      </button>

                    </div>


                    <p class="form-msg crop-msg"></p>

                  </div>

                </div>


                <p
                  class="form-msg service-msg"
                ></p>

              </div>

            </article>
          `;
        }
      )
      .join('');


  /* =========================
     EDITOR DE ENCUADRE
  ========================= */

  document
    .querySelectorAll(
      '.service-admin-card'
    )
    .forEach(
      (card) => {

        const editor =
          card.querySelector(
            '.service-crop-editor'
          );

        const openButton =
          card.querySelector(
            '.service-adjust'
          );

        const closeButton =
          card.querySelector(
            '.service-close-adjust'
          );

        const preview =
          card.querySelector(
            '.service-crop-preview'
          );

        const previewImg =
          preview?.querySelector('img');

        const zoomInput =
          card.querySelector(
            '.service-zoom'
          );

        const xInput =
          card.querySelector(
            '.service-x'
          );

        const yInput =
          card.querySelector(
            '.service-y'
          );

        const zoomValue =
          card.querySelector(
            '.zoom-value'
          );

        const xValue =
          card.querySelector(
            '.x-value'
          );

        const yValue =
          card.querySelector(
            '.y-value'
          );


        if (
          !editor ||
          !openButton ||
          !preview ||
          !previewImg ||
          !zoomInput ||
          !xInput ||
          !yInput
        ) {
          return;
        }


        const updatePreview =
          () => {

            const zoom =
              Number(
                zoomInput.value
              );

            const x =
              Number(
                xInput.value
              );

            const y =
              Number(
                yInput.value
              );


            previewImg.style.objectPosition =
              `${x}% ${y}%`;

            previewImg.style.transform =
              `scale(${zoom})`;


            if (zoomValue) {
              zoomValue.textContent =
                `${zoom.toFixed(2)}×`;
            }

            if (xValue) {
              xValue.textContent =
                `${Math.round(x)}%`;
            }

            if (yValue) {
              yValue.textContent =
                `${Math.round(y)}%`;
            }

          };


        openButton.addEventListener(
          'click',
          () => {

            editor.hidden =
              false;

            openButton.textContent =
              'Cerrar ajuste';

            updatePreview();

            editor.scrollIntoView({
              behavior:'smooth',
              block:'nearest'
            });

          }
        );


        closeButton?.addEventListener(
          'click',
          () => {

            editor.hidden =
              true;

            openButton.textContent =
              'Ajustar foto';

          }
        );


        zoomInput.addEventListener(
          'input',
          updatePreview
        );

        xInput.addEventListener(
          'input',
          updatePreview
        );

        yInput.addEventListener(
          'input',
          updatePreview
        );


        card
          .querySelector(
            '.service-reset-crop'
          )
          ?.addEventListener(
            'click',
            () => {

              zoomInput.value =
                '1';

              xInput.value =
                '50';

              yInput.value =
                '50';

              updatePreview();

            }
          );


        card
          .querySelector(
            '.service-save-crop'
          )
          ?.addEventListener(
            'click',
            async () => {

              const id =
                card.dataset.id;

              const cropMsg =
                card.querySelector(
                  '.crop-msg'
                );

              const zoom =
                Number(
                  zoomInput.value
                );

              const x =
                Number(
                  xInput.value
                );

              const y =
                Number(
                  yInput.value
                );


              cropMsg.textContent =
                'Guardando…';


              try {

                const {
                  error
                } = await sb
                  .from('cam_services')
                  .update({
                    image_zoom: zoom,
                    image_position_x: x,
                    image_position_y: y,
                    updated_at:
                      new Date().toISOString()
                  })
                  .eq('id', id);


                if (error) {
                  throw error;
                }


                cropMsg.textContent =
                  'Encuadre guardado.';

                setTimeout(
                  () => {

                    cropMsg.textContent =
                      '';

                  },
                  2200
                );


              } catch (error) {

                console.error(
                  'Error guardando encuadre:',
                  error
                );

                cropMsg.textContent =
                  error?.message ||
                  'No se pudo guardar el encuadre.';

              }

            }
          );

      }
    );


  /* =========================
     SUBIR FOTO DE SERVICIO
  ========================= */

  document
    .querySelectorAll('.service-file')
    .forEach(
      (input) => {

        input.onchange =
          async () => {

            const card =
              input.closest(
                '.service-admin-card'
              );

            const id =
              card.dataset.id;

            const file =
              input.files[0];

            if (!file) {
              return;
            }

            const service =
              services.find(
                (x) => x.id === id
              );

            const serviceMsg =
              card.querySelector(
                '.service-msg'
              );

            serviceMsg.textContent =
              'Subiendo…';

            try {

              if (service.storage_path) {

                await sb.storage
                  .from('cam-gallery')
                  .remove([
                    service.storage_path
                  ]);

              }

              const extension =
                file.name
                  .split('.')
                  .pop()
                  .toLowerCase();

              const path =
                `services/${id}.${extension}`;

              const url =
                await uploadImage(
                  file,
                  path
                );

              const {
                error
              } = await sb
                .from('cam_services')
                .update({
                  image_url: url,
                  storage_path: path,
                  image_zoom: 1,
                  image_position_x: 50,
                  image_position_y: 50,
                  updated_at:
                    new Date().toISOString()
                })
                .eq('id', id);

              if (error) {
                throw error;
              }

              await refresh();

            } catch (error) {

              console.error(
                'Error servicio:',
                error
              );

              serviceMsg.textContent =
                error?.message ||
                'No se pudo subir la foto.';

            }

          };

      }
    );


  /* =========================
     ELIMINAR FOTO DE SERVICIO
  ========================= */

  document
    .querySelectorAll(
      '.service-delete'
    )
    .forEach(
      (button) => {

        button.onclick =
          async () => {

            const card =
              button.closest(
                '.service-admin-card'
              );

            const id =
              card.dataset.id;

            const service =
              services.find(
                (x) => x.id === id
              );

            if (!service) {
              return;
            }

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
                  .remove([
                    service.storage_path
                  ]);

              }

              const {
                error
              } = await sb
                .from('cam_services')
                .update({
                  image_url: null,
                  storage_path: null,
                  image_zoom: 1,
                  image_position_x: 50,
                  image_position_y: 50,
                  updated_at:
                    new Date().toISOString()
                })
                .eq('id', id);

              if (error) {
                throw error;
              }

              await refresh();

            } catch (error) {

              alert(
                error?.message ||
                'No se pudo eliminar la foto.'
              );

            }

          };

      }
    );

}


/* =========================
   GALERÍA - SUBIR FOTOS
========================= */

$('#files').addEventListener(
  'change',
  async (e) => {

    const files =
      [...e.target.files];

    for (const file of files) {

      try {

        const extension =
          file.name
            .split('.')
            .pop()
            .toLowerCase();

        const path =
          `gallery/${crypto.randomUUID()}.${extension}`;

        const url =
          await uploadImage(
            file,
            path
          );

        const {
          count,
          error: countError
        } = await sb
          .from('cam_gallery')
          .select('*', {
            count: 'exact',
            head: true
          });

        if (countError) {
          throw countError;
        }

        const {
          error
        } = await sb
          .from('cam_gallery')
          .insert({
            image_url: url,
            storage_path: path,
            sort_order:
              (count || 0) + 1,
            alt_text:
              'Trabajo de uñas de lasuniasdecam'
          });

        if (error) {
          throw error;
        }

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

  }
);


/* =========================
   GUARDAR DATOS
========================= */

$('#settingsForm').addEventListener(
  'submit',
  async (e) => {

    e.preventDefault();

    const {
      error
    } = await sb
      .from('cam_site_settings')
      .update({
        instagram_url:
          $('#instagram')
            .value
            .trim(),

        phone:
          $('#phone')
            .value
            .trim(),

        location:
          $('#location')
            .value
            .trim(),

        updated_at:
          new Date().toISOString()
      })
      .eq('id', 1);

    $('#settingsMsg').textContent =
      error
        ? error.message
        : 'Cambios guardados.';

  }
);


/* =========================
   INICIAR
========================= */

await load();
