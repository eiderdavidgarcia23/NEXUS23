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
  }

  document.getElementById('cuentaUsuario').textContent = usuarioActual;
  document.getElementById('cuentaRol').textContent = rolActual === 'admin' ? 'Administrador' : 'Usuario';
  document.getElementById('cuentaEstado').textContent = 'Aprobado';

  cargarPlataformas();
  if (rolActual === 'admin') {
    cargarUsuariosPendientes();
    cargarTodosLosUsuarios();
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
const platformsRef = db.ref('plataformas');

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

function renderPlatforms(platforms) {
  platformsGrid.innerHTML = '';
  adminPlatformsList.innerHTML = '';

  const entries = Object.entries(platforms || {});

  if (entries.length === 0) {
    platformsGrid.innerHTML = '<p class="empty-msg">Aún no hay plataformas agregadas.</p>';
  }

  entries.forEach(([id, p]) => {
    const card = document.createElement('div');
    card.className = 'platform-card';
    card.innerHTML = `
      <h3>${p.nombre}</h3>
      <p>${p.descripcion || ''}</p>
      <div class="platform-status">
        <span class="status-dot status-checking" id="dot-${id}"></span>
        <span id="status-${id}">Verificando...</span>
      </div>
      <a href="${p.url}" target="_blank" class="open-btn">Abrir plataforma →</a>
    `;
    platformsGrid.appendChild(card);
    checkStatus(p.url, document.getElementById('dot-' + id), document.getElementById('status-' + id));

    if (rolActual === 'admin') {
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
    }
  });

  if (rolActual === 'admin') {
    adminPlatformsList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editPlatform(btn.dataset.id, platforms[btn.dataset.id]));
    });
    adminPlatformsList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePlatform(btn.dataset.id));
    });
  }
}

async function editPlatform(id, current) {
  const nombre = prompt('Nombre de la plataforma:', current.nombre);
  if (nombre === null) return;
  const descripcion = prompt('Descripción:', current.descripcion || '');
  if (descripcion === null) return;
  const url = prompt('URL:', current.url);
  if (url === null) return;
  await platformsRef.child(id).set({ nombre, descripcion, url });
}

async function deletePlatform(id) {
  if (!confirm('¿Eliminar esta plataforma del panel?')) return;
  await platformsRef.child(id).remove();
}

document.getElementById('addPlatformBtn').addEventListener('click', async () => {
  const nombre = prompt('Nombre de la nueva plataforma:');
  if (!nombre) return;
  const descripcion = prompt('Descripción:') || '';
  const url = prompt('URL:');
  if (!url) return;
  const id = nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  await platformsRef.child(id).set({ nombre, descripcion, url });
});

async function cargarPlataformas() {
  await ensurePlatformsSeeded();
  platformsRef.on('value', (snapshot) => {
    renderPlatforms(snapshot.val() || {});
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
  const usuario = prompt('Usuario para la nueva cuenta:');
  if (!usuario) return;
  const password = prompt('Contraseña (mínimo 6 caracteres):');
  if (!password) return;
  if (password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return; }
  const esAdmin = confirm('¿Será administrador?\n\nAceptar = Administrador\nCancelar = Usuario normal');

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
