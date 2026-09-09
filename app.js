const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;

  if (!usuario || !password) {
    errorMsg.textContent = 'Completa usuario y contraseña.';
    return;
  }

  try {
    const snapshot = await db.ref('usuarios/' + usuario).once('value');
    const userData = snapshot.val();

    if (!userData) {
      errorMsg.textContent = 'Usuario no encontrado.';
      return;
    }

    if (userData.password !== password) {
      errorMsg.textContent = 'Contraseña incorrecta.';
      return;
    }

    sessionStorage.setItem('nexus23_usuario', usuario);
    sessionStorage.setItem('nexus23_rol', userData.rol || 'usuario');
    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Error al conectar con el servidor.';
  }
});
