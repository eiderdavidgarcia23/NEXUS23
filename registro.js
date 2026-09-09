const registroForm = document.getElementById('registroForm');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword.addEventListener('click', () => {
  const type = passwordInput.type === 'password' ? 'text' : 'password';
  passwordInput.type = type;
});

registroForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  successMsg.textContent = '';

  const usuario = document.getElementById('usuario').value.trim();
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;

  if (!usuario || !password || !password2) {
    errorMsg.textContent = 'Completa todos los campos.';
    return;
  }

  if (password !== password2) {
    errorMsg.textContent = 'Las contraseñas no coinciden.';
    return;
  }

  if (password.length < 6) {
    errorMsg.textContent = 'La contraseña debe tener al menos 6 caracteres.';
    return;
  }

  const correoInterno = usuario.toLowerCase().replace(/\s+/g, '') + '@nexus23.local';

  try {
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(correoInterno, password);
    const uid = userCredential.user.uid;

    await db.ref('usuarios/' + uid).set({
      usuario: usuario,
      rol: 'pendiente'
    });

    await firebase.auth().signOut();

    registroForm.style.display = 'none';
    successMsg.textContent = 'Cuenta creada. Un administrador debe aprobarla antes de que puedas entrar.';

  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-in-use') {
      errorMsg.textContent = 'Ese usuario ya existe, elige otro.';
    } else if (err.code === 'auth/weak-password') {
      errorMsg.textContent = 'La contraseña es muy débil.';
    } else {
      errorMsg.textContent = 'Error al crear la cuenta.';
    }
  }
});
