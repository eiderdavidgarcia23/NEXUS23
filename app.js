const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const errorMsg = document.getElementById('errorMsg');
const regMsg = document.getElementById('regMsg');
const cardSubtitle = document.getElementById('cardSubtitle');

function correoInterno(usuario) {
  return usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';
}

document.querySelectorAll('.toggle-eye').forEach(eye => {
  eye.addEventListener('click', () => {
    const input = document.getElementById(eye.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

function showLoginForm() {
  loginForm.classList.remove('hidden-form');
  registerForm.classList.add('hidden-form');
  document.getElementById('toLoginText').classList.add('hidden-form');
  document.getElementById('toRegisterText').classList.remove('hidden-form');
  cardSubtitle.textContent = 'Accede a tu centro de comando';
  errorMsg.textContent = '';
  regMsg.textContent = '';
}

function showRegisterForm() {
  registerForm.classList.remove('hidden-form');
  loginForm.classList.add('hidden-form');
  document.getElementById('toRegisterText').classList.add('hidden-form');
  document.getElementById('toLoginText').classList.remove('hidden-form');
  cardSubtitle.textContent = 'Crea tu cuenta';
  errorMsg.textContent = '';
  regMsg.textContent = '';
}

document.getElementById('showRegister').addEventListener('click', (e) => {
  e.preventDefault();
  showRegisterForm();
});

document.getElementById('showLogin').addEventListener('click', (e) => {
  e.preventDefault();
  showLoginForm();
});

let primeraRevision = true;
auth.onAuthStateChanged(async (user) => {
  if (!primeraRevision) return;
  primeraRevision = false;

  if (!user) return;

  const snapshot = await db.ref('usuarios/' + user.uid).once('value');
  const datos = snapshot.val();
  if (datos && datos.estado !== 'pendiente') {
    window.location.href = 'dashboard.html';
  }
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
    const credencial = await auth.signInWithEmailAndPassword(correoInterno(usuario), password);
    const uid = credencial.user.uid;

    const snapshot = await db.ref('usuarios/' + uid).once('value');
    const userData = snapshot.val();

    if (!userData) {
      await auth.signOut();
      errorMsg.textContent = 'Usuario no encontrado.';
      return;
    }

    if (userData.estado === 'pendiente') {
      await auth.signOut();
      errorMsg.textContent = 'Tu cuenta está pendiente de aprobación por un administrador.';
      return;
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    console.error(err);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
      errorMsg.textContent = 'Usuario o contraseña incorrectos.';
    } else {
      errorMsg.textContent = 'Error al conectar con el servidor.';
    }
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  regMsg.textContent = '';
  regMsg.classList.remove('success-msg');

  const usuario = document.getElementById('regUsuario').value.trim();
  const password = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;

  if (!usuario || !password || !password2) {
    regMsg.textContent = 'Completa todos los campos.';
    return;
  }

  if (password !== password2) {
    regMsg.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  if (password.length < 6) {
    regMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  try {
    const credencial = await auth.createUserWithEmailAndPassword(correoInterno(usuario), password);
    const uid = credencial.user.uid;

    await db.ref('usuarios/' + uid).set({
      usuario: usuario,
      rol: 'usuario',
      estado: 'pendiente'
    });

    await auth.signOut();

    registerForm.reset();
    regMsg.classList.add('success-msg');
    regMsg.textContent = 'Cuenta creada. Queda pendiente hasta que un administrador la apruebe.';

  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      regMsg.textContent = 'Ese usuario ya existe.';
    } else if (err.code === 'auth/weak-password') {
      regMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    } else {
      regMsg.textContent = 'Error al conectar con el servidor.';
    }
  }
});
