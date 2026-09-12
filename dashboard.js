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
  if (rolActual === 'admin') cargarUsuariosPendientes();
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
