const usuario = sessionStorage.getItem('nexus23_usuario');
const rol = sessionStorage.getItem('nexus23_rol');

if (!usuario) {
  window.location.href = 'index.html';
}

document.getElementById('userLabel').textContent = 'Hola, ' + usuario;
document.getElementById('sidebarUserLabel').textContent = 'Sesión de ' + usuario;

if (rol === 'admin') {
  document.body.classList.add('is-admin');
}

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebarOverlay');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebarClose = document.getElementById('sidebarClose');

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('active');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
}

hamburgerBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

const views = {
  inicio: document.getElementById('view-inicio'),
  placeholder: document.getElementById('view-placeholder')
};

const placeholderTitles = {
  cuenta: { title: 'Cuenta', text: 'Aquí podrás ver y editar los datos de tu cuenta. (Próximamente)' },
  usuarios: { title: 'Gestionar usuarios', text: 'Aquí podrás crear, editar y eliminar usuarios. (Próximamente)' },
  plataformas: { title: 'Agregar/editar plataformas', text: 'Aquí podrás agregar o editar las plataformas del dashboard. (Próximamente)' },
  estadisticas: { title: 'Estadísticas', text: 'Aquí verás estadísticas y logs de acceso. (Próximamente)' }
};

function showView(viewName) {
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

  if (viewName === 'inicio') {
    views.inicio.classList.add('active-view');
    views.placeholder.classList.remove('active-view');
  } else {
    views.inicio.classList.remove('active-view');
    views.placeholder.classList.add('active-view');
    const data = placeholderTitles[viewName];
    document.getElementById('placeholderTitle').textContent = data.title;
    document.getElementById('placeholderText').textContent = data.text;
  }

  const activeLink = document.querySelector('.sidebar-link[data-view="' + viewName + '"]');
  if (activeLink) activeLink.classList.add('active');
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showView(link.dataset.view);
    closeSidebar();
  });
});

document.getElementById('brandHome').addEventListener('click', () => {
  showView('inicio');
  closeSidebar();
});

showView('inicio');

function logout() {
  sessionStorage.removeItem('nexus23_usuario');
  sessionStorage.removeItem('nexus23_rol');
  window.location.href = 'index.html';
}
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtnSidebar').addEventListener('click', logout);

async function checkStatus(url, dotId, statusId) {
  const dot = document.getElementById(dotId);
  const status = document.getElementById(statusId);
  try {
    await fetch(url, { mode: 'no-cors' });
    dot.className = 'status-dot status-online';
    status.textContent = 'En línea';
  } catch (err) {
    dot.className = 'status-dot status-offline';
    status.textContent = 'No disponible';
  }
}

checkStatus('https://eiderdavidgarcia23.github.io/coopmocur-system/', 'dotCoopmocur', 'statusCoopmocur');
checkStatus('https://jarvis-ne7h.onrender.com', 'dotJarvis', 'statusJarvis');
