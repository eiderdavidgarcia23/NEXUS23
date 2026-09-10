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
  const recuerdame = document.getElementById('remember').checked;

  if (!usuario || !password) {
    errorMsg.textContent = 'Completa usuario y contraseña.';
    return;
  }

  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';

  try {
    const persistencia = recuerdame
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    await firebase.auth().setPersistence(persistencia);

    const userCredential = await firebase.auth().signInWithEmailAndPassword(correoInterno, password);
    const uid = userCredential.user.uid;

    const snapshot = await db.ref('usuarios/' + uid).once('value');
    const userData = snapshot.val();

    if (!userData) {
      errorMsg.textContent = 'Tu cuenta no tiene datos asignados. Contacta al administrador.';
      await firebase.auth().signOut();
      return;
    }

    if (userData.rol === 'pendiente') {
      errorMsg.textContent = 'Tu cuenta está pendiente de aprobación por un administrador.';
      await firebase.auth().signOut();
      return;
    }

    sessionStorage.setItem('nexus23_usuario', userData.usuario || usuario);
    sessionStorage.setItem('nexus23_rol', userData.rol || 'usuario');
    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error(err);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
      errorMsg.textContent = 'Usuario o contraseña incorrectos.';
    } else if (err.code === 'auth/too-many-requests') {
      errorMsg.textContent = 'Demasiados intentos. Espera un momento e intenta de nuevo.';
    } else {
      errorMsg.textContent = 'Error al conectar con el servidor.';
    }
  }
});
