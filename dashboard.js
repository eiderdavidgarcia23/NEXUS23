let uidActual = null;
let usuarioActual = null;
let rolActual = 'usuario';

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  const snapshot = await db.ref('usuarios/' + user.uid).once('value');
  const datos = snapshot.val();

  if (!datos || datos.estado === 'pendiente') {
    await auth.signOut();
    window.location.href = 'index.html';
    return;
  }

  uidActual = user.uid;
  usuarioActual = datos.usuario;
  rolActual = datos.rol || 'usuario';

  iniciarDashboard();
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  auth.signOut().then(() => window.location.href = 'index.html');
});

function iniciarDashboard() {
  document.getElementById('userLabel').textContent = 'Hola, ' + usuarioActual;

  if (rolActual === 'admin') {
    document.getElementById('navAdmin').hidden = false;
    document.getElementById('navTodas').hidden = false;
  }

  document.getElementById('cuentaUsuario').textContent = usuarioActual;
  document.getElementById('cuentaRol').textContent = rolActual === 'admin' ? 'Administrador' : 'Usuario';
  document.getElementById('cuentaEstado').textContent = 'Aprobado';

  cargarPlataformas();
  if (rolActual === 'admin') {
    cargarUsuariosPendientes();
    cargarTodosLosUsuarios();
    cargarAsignaciones();
    cargarTodasLasPlataformas();
  }
}

// --- Sidebar: hamburguesa (móvil) ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}
document.getElementById('hamburgerBtn').addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

// --- Navegación entre secciones ---
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.dataset.section;
    views.forEach(v => v.id === 'view-' + target ? v.removeAttribute('hidden') : v.setAttribute('hidden', ''));
    closeSidebar();
  });
});

document.getElementById('brandHome').addEventListener('click', () => {
  navItems.forEach(i => i.classList.remove('active'));
  document.querySelector('.nav-item[data-section="inicio"]').classList.add('active');
  views.forEach(v => v.id === 'view-inicio' ? v.removeAttribute('hidden') : v.setAttribute('hidden', ''));
  closeSidebar();
});

// --- Modal reutilizable (reemplaza los prompt() nativos del navegador) ---
function openModal({ title, fields, submitLabel }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const fieldsEl = document.getElementById('modalFields');
    const errorEl = document.getElementById('modalError');
    const acceptBtn = document.getElementById('modalAcceptBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');

    titleEl.textContent = title;
    errorEl.textContent = '';
    fieldsEl.innerHTML = '';
    acceptBtn.textContent = submitLabel || 'Aceptar';

    fields.forEach((f) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-field';

      const label = document.createElement('label');
      label.textContent = f.label;
      label.setAttribute('for', 'modal-input-' + f.id);
      wrap.appendChild(label);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach((opt) => {
          const optionEl = document.createElement('option');
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          if (opt.value === f.value) optionEl.selected = true;
          input.appendChild(optionEl);
        });
      } else {
        input = document.createElement('input');
        input.type = f.type || 'text';
        input.value = f.value || '';
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      input.id = 'modal-input-' + f.id;
      wrap.appendChild(input);
      fieldsEl.appendChild(wrap);
    });

    overlay.classList.add('visible');
    const firstInput = fieldsEl.querySelector('input, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);

    function cleanup() {
      overlay.classList.remove('visible');
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeydown);
    }

    function onAccept() {
      const values = {};
      for (const f of fields) {
        const el = document.getElementById('modal-input-' + f.id);
        values[f.id] = el.value.trim();
      }
      for (const f of fields) {
        if (f.required !== false && !values[f.id]) {
          errorEl.textContent = 'Completa el campo "' + f.label + '".';
          return;
        }
      }
      cleanup();
      resolve(values);
    }

    function onCancel() {
      cleanup();
      resolve(null);
    }

    function onOverlayClick(e) {
      if (e.target === overlay) onCancel();
    }

    function onKeydown(e) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && document.activeElement.tagName !== 'SELECT') onAccept();
    }

    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeydown);
  });
}

// --- Plataformas (Inicio) ---
const DEFAULT_PLATFORMS = {
  coopmocur: {
    nombre: 'Deli Maní',
    descripcion: 'Sistema de inventario y ventas de maní confitado.',
    url: 'https://eiderdavidgarcia23.github.io/coopmocur-system/'
  }
};

const platformsGrid = document.getElementById('platformsGrid');
const adminPlatformsList = document.getElementById('adminPlatformsList');
const platformsRef = db.ref('plataformas'); // catálogo global del admin

// Caches en memoria que se actualizan con los listeners de Firebase
let globalPlataformasCache = {};   // plataformas del admin (compartidas)
let misPlataformasCache = {};      // plataformas propias del usuario normal
let asignacionesCache = {};        // ids de plataformas globales asignadas a este usuario

async function ensurePlatformsSeeded() {
  const snapshot = await platformsRef.once('value');
  if (!snapshot.exists()) {
    await platformsRef.set(DEFAULT_PLATFORMS);
  }
}

function checkStatus(url, dot, statusEl) {
  fetch(url, { mode: 'no-cors' })
    .then(() => {
      dot.className = 'status-dot status-online';
      statusEl.textContent = 'En línea';
    })
    .catch(() => {
      dot.className = 'status-dot status-offline';
      statusEl.textContent = 'No disponible';
    });
}

// Referencia según el "origen" de una plataforma: propia del usuario, o global del admin
function refFor(source) {
  if (source === 'propia') return db.ref('usuarios/' + uidActual + '/misPlataformas');
  return platformsRef;
}

// Construye la lista de plataformas que le corresponde ver al usuario actual
function buildVisiblePlatforms() {
  if (rolActual === 'admin') {
    return Object.entries(globalPlataformasCache).map(([id, p]) => ({ id, data: p, editable: true, source: 'global' }));
  }
  const propias = Object.entries(misPlataformasCache).map(([id, p]) => ({ id, data: p, editable: true, source: 'propia' }));
  const asignadas = Object.entries(globalPlataformasCache)
    .filter(([id]) => asignacionesCache[id])
    .map(([id, p]) => ({ id, data: p, editable: false, source: 'global' }));
  return [...propias, ...asignadas];
}

function renderPlatforms() {
  platformsGrid.innerHTML = '';
  const visibles = buildVisiblePlatforms();

  if (visibles.length === 0) {
    platformsGrid.innerHTML = '<p class="empty-msg">Aún no hay plataformas agregadas.</p>';
  }

  visibles.forEach(({ id, data: p, editable, source }) => {
    const domKey = source + '-' + id;
    const card = document.createElement('div');
    card.className = 'platform-card';
    card.innerHTML = `
      <h3>${p.nombre}</h3>
      <p>${p.descripcion || ''}</p>
      <div class="platform-status">
        <span class="status-dot status-checking" id="dot-${domKey}"></span>
        <span id="status-${domKey}">Verificando...</span>
      </div>
      ${!editable ? '<span class="platform-owner-tag">Asignada por el admin</span>' : ''}
      <a href="${p.url}" target="_blank" class="open-btn">Abrir plataforma →</a>
      ${editable ? `
        <div class="platform-card-actions">
          <button class="edit-btn" data-id="${id}" data-source="${source}">Editar</button>
          <button class="delete-btn" data-id="${id}" data-source="${source}">Eliminar</button>
        </div>` : ''}
    `;
    platformsGrid.appendChild(card);
    checkStatus(p.url, document.getElementById('dot-' + domKey), document.getElementById('status-' + domKey));
  });

  platformsGrid.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id, source = btn.dataset.source;
      const current = source === 'propia' ? misPlataformasCache[id] : globalPlataformasCache[id];
      editPlatform(id, current, source);
    });
  });
  platformsGrid.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePlatform(btn.dataset.id, btn.dataset.source));
  });

  if (rolActual === 'admin') {
    renderAdminPlatformsList();
  }
}

function renderAdminPlatformsList() {
  adminPlatformsList.innerHTML = '';
  const entries = Object.entries(globalPlataformasCache);

  if (entries.length === 0) {
    adminPlatformsList.innerHTML = '<p class="empty-msg">Aún no hay plataformas globales.</p>';
  }

  entries.forEach(([id, p]) => {
    const row = document.createElement('div');
    row.className = 'admin-platform-row';
    row.innerHTML = `
      <div>
        <strong>${p.nombre}</strong>
        <span class="admin-platform-url">${p.url}</span>
      </div>
      <div class="admin-platform-actions">
        <button class="edit-btn" data-id="${id}">Editar</button>
        <button class="delete-btn" data-id="${id}">Eliminar</button>
      </div>
    `;
    adminPlatformsList.appendChild(row);
  });

  adminPlatformsList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editPlatform(btn.dataset.id, globalPlataformasCache[btn.dataset.id], 'global'));
  });
  adminPlatformsList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePlatform(btn.dataset.id, 'global'));
  });
}

async function editPlatform(id, current, source) {
  const result = await openModal({
    title: 'Editar plataforma',
    fields: [
      { id: 'nombre', label: 'Nombre', value: current.nombre },
      { id: 'descripcion', label: 'Descripción', value: current.descripcion || '', required: false },
      { id: 'url', label: 'URL', value: current.url }
    ]
  });
  if (!result) return;
  await refFor(source).child(id).set({ nombre: result.nombre, descripcion: result.descripcion, url: result.url });
}

async function deletePlatform(id, source) {
  if (!confirm('¿Eliminar esta plataforma?')) return;
  await refFor(source).child(id).remove();
}

document.getElementById('addPlatformBtn').addEventListener('click', async () => {
  const result = await openModal({
    title: 'Agregar plataforma',
    fields: [
      { id: 'nombre', label: 'Nombre' },
      { id: 'descripcion', label: 'Descripción', required: false },
      { id: 'url', label: 'URL' }
    ]
  });
  if (!result) return;
  const id = result.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await platformsRef.child(id).set({ nombre: result.nombre, descripcion: result.descripcion, url: result.url });
});

// Botón de "Inicio": para admin agrega al catálogo global, para usuario agrega a sus propias plataformas
document.getElementById('addMyPlatformBtn').addEventListener('click', async () => {
  const result = await openModal({
    title: 'Agregar plataforma',
    fields: [
      { id: 'nombre', label: 'Nombre' },
      { id: 'descripcion', label: 'Descripción', required: false },
      { id: 'url', label: 'URL' }
    ]
  });
  if (!result) return;
  const id = result.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const source = rolActual === 'admin' ? 'global' : 'propia';
  await refFor(source).child(id).set({ nombre: result.nombre, descripcion: result.descripcion, url: result.url });
});

async function cargarPlataformas() {
  if (rolActual === 'admin') {
    await ensurePlatformsSeeded();
  }

  // Todos necesitan el catálogo global: el admin para gestionarlo, el usuario para ver lo que le asignen
  platformsRef.on('value', (snapshot) => {
    globalPlataformasCache = snapshot.val() || {};
    renderPlatforms();
    if (rolActual === 'admin' && asignarUsuarioSelect.value) {
      renderAsignacionesUsuario(asignarUsuarioSelect.value, asignacionesUsuarioSeleccionadoCache);
    }
  });

  if (rolActual !== 'admin') {
    db.ref('usuarios/' + uidActual + '/misPlataformas').on('value', (snapshot) => {
      misPlataformasCache = snapshot.val() || {};
      renderPlatforms();
    });
    db.ref('asignaciones/' + uidActual).on('value', (snapshot) => {
      asignacionesCache = snapshot.val() || {};
      renderPlatforms();
    });
  }
}

// --- Administración: asignar plataformas globales a usuarios normales ---
const asignarUsuarioSelect = document.getElementById('asignarUsuarioSelect');
const asignarPlataformasList = document.getElementById('asignarPlataformasList');
let usuariosCacheGlobal = {};
let asignacionesUsuarioRefActual = null;
let asignacionesUsuarioSeleccionadoCache = {};

function cargarAsignaciones() {
  usuariosRefGlobal.on('value', (snapshot) => {
    usuariosCacheGlobal = snapshot.val() || {};
    poblarSelectUsuariosAsignar();
  });
}

function poblarSelectUsuariosAsignar() {
  const seleccionPrevia = asignarUsuarioSelect.value;
  const normales = Object.entries(usuariosCacheGlobal).filter(([, u]) => u.rol !== 'admin' && u.estado !== 'pendiente');

  asignarUsuarioSelect.innerHTML = '';

  if (normales.length === 0) {
    asignarUsuarioSelect.innerHTML = '<option value="">No hay usuarios normales</option>';
    asignarPlataformasList.innerHTML = '<p class="empty-msg">No hay usuarios normales para asignar plataformas.</p>';
    return;
  }

  normales.forEach(([uid, datos]) => {
    const opt = document.createElement('option');
    opt.value = uid;
    opt.textContent = datos.usuario || uid;
    asignarUsuarioSelect.appendChild(opt);
  });

  const sigueExistiendo = normales.some(([uid]) => uid === seleccionPrevia);
  asignarUsuarioSelect.value = sigueExistiendo ? seleccionPrevia : normales[0][0];
  cargarAsignacionesUsuarioSeleccionado();
}

asignarUsuarioSelect.addEventListener('change', cargarAsignacionesUsuarioSeleccionado);

function cargarAsignacionesUsuarioSeleccionado() {
  const uid = asignarUsuarioSelect.value;
  if (asignacionesUsuarioRefActual) asignacionesUsuarioRefActual.off();
  if (!uid) {
    renderAsignacionesUsuario(null, {});
    return;
  }
  asignacionesUsuarioRefActual = db.ref('asignaciones/' + uid);
  asignacionesUsuarioRefActual.on('value', (snapshot) => {
    asignacionesUsuarioSeleccionadoCache = snapshot.val() || {};
    renderAsignacionesUsuario(uid, asignacionesUsuarioSeleccionadoCache);
  });
}

function renderAsignacionesUsuario(uid, asignadas) {
  asignarPlataformasList.innerHTML = '';
  const entries = Object.entries(globalPlataformasCache);

  if (!uid || entries.length === 0) {
    asignarPlataformasList.innerHTML = '<p class="empty-msg">No hay plataformas globales para asignar.</p>';
    return;
  }

  entries.forEach(([id, p]) => {
    const row = document.createElement('div');
    row.className = 'admin-platform-row';
    row.innerHTML = `
      <div><strong>${p.nombre}</strong></div>
      <label class="platform-assign-toggle">
        <input type="checkbox" class="assign-checkbox" data-id="${id}" ${asignadas[id] ? 'checked' : ''}>
        Visible para este usuario
      </label>
    `;
    asignarPlataformasList.appendChild(row);
  });

  asignarPlataformasList.querySelectorAll('.assign-checkbox').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.dataset.id;
      if (chk.checked) {
        db.ref('asignaciones/' + uid + '/' + id).set(true);
      } else {
        db.ref('asignaciones/' + uid + '/' + id).remove();
      }
    });
  });
}

// --- Interfaz de admin: ver todas las plataformas de todos los usuarios ---
function cargarTodasLasPlataformas() {
  const todasGlobalesList = document.getElementById('todasGlobalesList');
  const todasPorUsuario = document.getElementById('todasPorUsuario');

  platformsRef.on('value', (snapshot) => {
    const globales = snapshot.val() || {};
    todasGlobalesList.innerHTML = '';
    const entries = Object.entries(globales);

    if (entries.length === 0) {
      todasGlobalesList.innerHTML = '<p class="empty-msg">No hay plataformas globales.</p>';
    }

    entries.forEach(([id, p]) => {
      const row = document.createElement('div');
      row.className = 'admin-platform-row';
      row.innerHTML = `<div><strong>${p.nombre}</strong><span class="admin-platform-url">${p.url}</span></div>`;
      todasGlobalesList.appendChild(row);
    });
  });

  usuariosRefGlobal.on('value', (snapshot) => {
    const usuarios = snapshot.val() || {};
    todasPorUsuario.innerHTML = '';
    const conPlataformas = Object.entries(usuarios).filter(([, u]) => u.misPlataformas && Object.keys(u.misPlataformas).length > 0);

    if (conPlataformas.length === 0) {
      todasPorUsuario.innerHTML = '<p class="empty-msg">Ningún usuario ha agregado plataformas propias todavía.</p>';
      return;
    }

    conPlataformas.forEach(([uid, datos]) => {
      const bloque = document.createElement('div');
      bloque.className = 'usuario-plataformas-bloque';
      const filas = Object.entries(datos.misPlataformas).map(([id, p]) => `
        <div class="admin-platform-row">
          <div>
            <strong>${p.nombre}</strong>
            <span class="admin-platform-url">${p.url}</span>
          </div>
          <div class="admin-platform-actions">
            <button class="delete-btn" data-uid="${uid}" data-id="${id}">Eliminar</button>
          </div>
        </div>
      `).join('');
      bloque.innerHTML = `<p class="section-label section-label-spaced">${datos.usuario || uid}</p>${filas}`;
      todasPorUsuario.appendChild(bloque);
    });

    todasPorUsuario.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Eliminar esta plataforma del usuario? Esto no se puede deshacer.')) {
          db.ref('usuarios/' + btn.dataset.uid + '/misPlataformas/' + btn.dataset.id).remove();
        }
      });
    });
  });
}

// --- Administración: usuarios pendientes (ahora guardados por UID) ---
function cargarUsuariosPendientes() {
  const pendingList = document.getElementById('pendingList');
  const pendingEmptyMsg = document.getElementById('pendingEmptyMsg');
  const usuariosRef = db.ref('usuarios');

  usuariosRef.on('value', (snapshot) => {
    const usuarios = snapshot.val() || {};
    const pendientes = Object.entries(usuarios).filter(([, u]) => u.estado === 'pendiente');

    pendingList.querySelectorAll('.pending-row').forEach(el => el.remove());
    pendingEmptyMsg.style.display = pendientes.length === 0 ? 'block' : 'none';

    pendientes.forEach(([uid, datos]) => {
      const row = document.createElement('div');
      row.className = 'pending-row';
      row.innerHTML = `
        <span>${datos.usuario || uid}</span>
        <div class="pending-actions">
          <button class="approve-btn" data-uid="${uid}">Aprobar</button>
          <button class="reject-btn" data-uid="${uid}">Rechazar</button>
        </div>
      `;
      pendingList.appendChild(row);
    });

    pendingList.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        usuariosRef.child(btn.dataset.uid).update({ estado: 'aprobado' });
      });
    });
    pendingList.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Rechazar esta solicitud de registro?')) {
          usuariosRef.child(btn.dataset.uid).remove();
        }
      });
    });
  });
}

// --- Administración: gestión completa de usuarios (CRUD) ---
const adminUsersList = document.getElementById('adminUsersList');
const usuariosRefGlobal = db.ref('usuarios');

function cargarTodosLosUsuarios() {
  usuariosRefGlobal.on('value', (snapshot) => {
    const usuarios = snapshot.val() || {};
    const entries = Object.entries(usuarios);

    adminUsersList.innerHTML = '';

    if (entries.length === 0) {
      adminUsersList.innerHTML = '<p class="empty-msg">No hay usuarios registrados.</p>';
      return;
    }

    entries.forEach(([uid, datos]) => {
      const row = document.createElement('div');
      row.className = 'admin-user-row';
      const estado = datos.estado === 'pendiente' ? 'Pendiente' : 'Aprobado';
      const rol = datos.rol === 'admin' ? 'Administrador' : 'Usuario';
      row.innerHTML = `
        <div>
          <strong>${datos.usuario || uid}</strong>
          <span class="admin-platform-url">${rol} · ${estado}</span>
        </div>
        <div class="admin-user-actions">
          <button class="edit-btn" data-uid="${uid}" data-action="rol">Cambiar rol</button>
          <button class="edit-btn" data-uid="${uid}" data-action="estado">${datos.estado === 'pendiente' ? 'Aprobar' : 'Suspender'}</button>
          <button class="delete-btn" data-uid="${uid}">Eliminar</button>
        </div>
      `;
      adminUsersList.appendChild(row);
    });

    adminUsersList.querySelectorAll('.edit-btn[data-action="rol"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const actual = usuarios[uid].rol === 'admin' ? 'admin' : 'usuario';
        const nuevoRol = actual === 'admin' ? 'usuario' : 'admin';
        if (uid === uidActual && nuevoRol !== 'admin' && !confirm('Vas a quitarte tu propio rol de administrador. ¿Continuar?')) return;
        usuariosRefGlobal.child(uid).update({ rol: nuevoRol });
      });
    });

    adminUsersList.querySelectorAll('.edit-btn[data-action="estado"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        if (uid === uidActual) { alert('No puedes cambiar el estado de tu propia cuenta.'); return; }
        const actual = usuarios[uid].estado === 'pendiente' ? 'pendiente' : 'aprobado';
        const nuevoEstado = actual === 'pendiente' ? 'aprobado' : 'pendiente';
        usuariosRefGlobal.child(uid).update({ estado: nuevoEstado });
      });
    });

    adminUsersList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        if (uid === uidActual) { alert('No puedes eliminar tu propia cuenta desde aquí.'); return; }
        if (confirm('¿Eliminar este usuario del sistema? Esto no se puede deshacer.')) {
          usuariosRefGlobal.child(uid).remove();
        }
      });
    });
  });
}

// Crear usuario nuevo desde el panel de admin, sin cerrar tu propia sesión
function obtenerAuthSecundaria() {
  const existente = firebase.apps.find(a => a.name === 'AdminCreate');
  const secondaryApp = existente || firebase.initializeApp(firebaseConfig, 'AdminCreate');
  return firebase.auth(secondaryApp);
}

document.getElementById('addUserBtn').addEventListener('click', async () => {
  const result = await openModal({
    title: 'Crear usuario',
    fields: [
      { id: 'usuario', label: 'Usuario' },
      { id: 'password', label: 'Contraseña (mínimo 6 caracteres)', type: 'password' },
      {
        id: 'rol',
        label: 'Tipo de cuenta',
        type: 'select',
        value: 'usuario',
        options: [
          { value: 'usuario', label: 'Usuario normal' },
          { value: 'admin', label: 'Administrador' }
        ]
      }
    ]
  });
  if (!result) return;
  const usuario = result.usuario;
  const password = result.password;
  if (password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
  const esAdmin = result.rol === 'admin';

  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';
  const secondaryAuth = obtenerAuthSecundaria();

  try {
    const credencial = await secondaryAuth.createUserWithEmailAndPassword(correoInterno, password);
    const uid = credencial.user.uid;
    await db.ref('usuarios/' + uid).set({
      usuario: usuario,
      rol: esAdmin ? 'admin' : 'usuario',
      estado: 'aprobado'
    });
    await secondaryAuth.signOut();
    alert('Usuario creado y aprobado correctamente.');
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      alert('Ese usuario ya existe.');
    } else if (err.code === 'auth/weak-password') {
      alert('La contraseña es muy débil.');
    } else {
      alert('Error al crear el usuario.');
    }
  }
});
