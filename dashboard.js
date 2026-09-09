const usuario = sessionStorage.getItem('nexus23_usuario');

if (!usuario) {
  window.location.href = 'index.html';
}

document.getElementById('userLabel').textContent = 'Hola, ' + usuario;

document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('nexus23_usuario');
  sessionStorage.removeItem('nexus23_rol');
  window.location.href = 'index.html';
});

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
