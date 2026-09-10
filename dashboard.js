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
  usuarios: document.getElementById('view-usuarios'),
  cuenta: document.getElementById('view-cuenta'),
  placeholder: document.getElementById('view-placeholder')
};

const placeholderTitles = {
  plataformas: { title: 'Agregar/editar plataformas', text: 'Aquí podrás agregar o editar las plataformas del dashboard. (Próximamente)' },
  estadisticas: { title: 'Estadísticas', text: 'Aquí verás estadísticas y logs de acceso. (Próximamente)' }
};

function showView(viewName) {
  document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));

  views.inicio.classList.remove('active-view');
  views.usuarios.classList.remove('active-view');
  views.cuenta.classList.remove('active-view');
  views.placeholder.classList.remove('active-view');

  if (viewName === 'inicio') {
    views.inicio.classList.add('active-view');
  } else if (viewName === 'usuarios') {
    views.usuarios.classList.add('active-view');
    loadUsersList();
  } else if (viewName === 'cuenta') {
    views.cuenta.classList.add('active-view');
  } else {
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
  firebase.auth().signOut().then(() => {
    sessionStorage.removeItem('nexus23_usuario');
    sessionStorage.removeItem('nexus23_rol');
    window.location.href = 'index.html';
  });
}
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('logoutBtnSidebar').addEventListener('click', logout);

let currentUser = null;

firebase.auth().onAuthStateChanged(function(user) {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  currentUser = user;

  db.ref('usuarios/' + user.uid).once('value').then(snapshot => {
    const userData = snapshot.val();

    if (!userData || userData.rol === 'pendiente') {
      firebase.auth().signOut();
      window.location.href = 'index.html';
      return;
    }

    const nombre = userData.usuario || user.email;
    const rol = userData.rol || 'usuario';

    document.getElementById('userLabel').textContent = 'Hola, ' + nombre;
    document.getElementById('sidebarUserLabel').textContent = 'Sesión de ' + nombre;
    document.getElementById('cuentaUsuarioLabel').textContent = nombre;

    if (rol === 'admin') {
      document.body.classList.add('is-admin');
    }
  });
});

document.getElementById('cambiarPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('cuentaMsg');
  msg.textContent = '';
  msg.className = 'account-msg';

  const actual = document.getElementById('passwordActual').value;
  const nueva = document.getElementById('passwordNueva').value;
  const nueva2 = document.getElementById('passwordNueva2').value;

  if (!actual || !nueva || !nueva2) {
    msg.textContent = 'Completa todos los campos.';
    msg.classList.add('account-msg-error');
    return;
  }

  if (nueva !== nueva2) {
    msg.textContent = 'Las contraseñas nuevas no coinciden.';
    msg.classList.add('account-msg-error');
    return;
  }

  if (nueva.length < 6) {
    msg.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
    msg.classList.add('account-msg-error');
    return;
  }

  try {
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, actual);
    await currentUser.reauthenticateWithCredential(credential);
    await currentUser.updatePassword(nueva);

    msg.textContent = 'Contraseña actualizada correctamente.';
    msg.classList.add('account-msg-success');
    document.getElementById('cambiarPasswordForm').reset();

  } catch (err) {
    console.error(err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg.textContent = 'La contraseña actual es incorrecta.';
    } else if (err.code === 'auth/weak-password') {
      msg.textContent = 'La nueva contraseña es muy débil.';
    } else if (err.code === 'auth/too-many-requests') {
      msg.textContent = 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    } else {
      msg.textContent = 'No se pudo cambiar la contraseña. Intenta de nuevo.';
    }
    msg.classList.add('account-msg-error');
  }
});

function loadUsersList() {
  const container = document.getElementById('usuariosList');
  container.innerHTML = '<p class="loading-text">Cargando usuarios...</p>';

  db.ref('usuarios').once('value').then(snapshot => {
    const data = snapshot.val() || {};
    const uids = Object.keys(data);

    if (uids.length === 0) {
      container.innerHTML = '<p class="loading-text">No hay usuarios.</p>';
      return;
    }

    container.innerHTML = '';

    uids.forEach(uid => {
      const u = data[uid];
      const card = document.createElement('div');
      card.className = 'user-card';

      let rolBadgeClass = 'badge-usuario';
      let rolLabel = 'Usuario';
      if (u.rol === 'admin') { rolBadgeClass = 'badge-admin'; rolLabel = 'Admin'; }
      if (u.rol === 'pendiente') { rolBadgeClass = 'badge-pendiente'; rolLabel = 'Pendiente'; }

      let botones = '';

      if (u.rol === 'pendiente') {
        botones += '<button class="btn-approve" data-uid="' + uid + '">Aprobar</button>';
        botones += '<button class="btn-reject" data-uid="' + uid + '">Rechazar</button>';
      } else if (u.rol === 'admin') {
        botones += '<button class="btn-toggle-admin" data-uid="' + uid + '" data-newrol="usuario">Quitar admin</button>';
        botones += '<button class="btn-delete" data-uid="' + uid + '">Eliminar</button>';
      } else {
        botones += '<button class="btn-toggle-admin" data-uid="' + uid + '" data-newrol="admin">Hacer admin</button>';
        botones += '<button class="btn-delete" data-uid="' + uid + '">Eliminar</button>';
      }

      card.innerHTML =
        '<div class="user-info">' +
          '<span class="user-name">' + (u.usuario || '(sin nombre)') + '</span>' +
          '<span class="rol-badge ' + rolBadgeClass + '">' + rolLabel + '</span>' +
        '</div>' +
        '<div class="user-actions">' + botones + '</div>';

      container.appendChild(card);
    });

    attachUserActionListeners();
  }).catch(err => {
    console.error(err);
    container.innerHTML = '<p class="loading-text">No se pudo cargar la lista de usuarios.</p>';
  });
}

function attachUserActionListeners() {
  document.querySelectorAll('.btn-approve').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      db.ref('usuarios/' + uid + '/rol').set('usuario').then(loadUsersList);
    });
  });

  document.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      if (confirm('¿Rechazar y eliminar esta cuenta pendiente?')) {
        db.ref('usuarios/' + uid).remove().then(loadUsersList);
      }
    });
  });

  document.querySelectorAll('.btn-toggle-admin').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const nuevoRol = btn.dataset.newrol;
      db.ref('usuarios/' + uid + '/rol').set(nuevoRol).then(loadUsersList);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      if (confirm('¿Eliminar este usuario? No podrá volver a entrar a la plataforma.')) {
        db.ref('usuarios/' + uid).remove().then(loadUsersList);
      }
    });
  });
}

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
