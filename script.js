// Variables globales
let usuarioActual = null;
let alumnosFiltrados = [];
let filtroActual = 'todos';

// Esperar a que Firebase esté listo
window.addEventListener('load', async () => {
  // Inicializar datos por defecto si no existen
  await inicializarDatos();
});

// Inicializar datos por defecto
async function inicializarDatos() {
  try {
    const { collection, getDocs, setDoc, doc } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const snapshot = await getDocs(usuariosRef);
    
    // Si no hay usuarios, crear el admin y alumnos de ejemplo
    if (snapshot.empty) {
      const usuarios = [
        { usuario: 'admin', contraseña: 'admin123', tipo: 'admin' },
        { usuario: 'alumno1', contraseña: 'alumno123', tipo: 'alumno', nombre: 'Juan Pérez', cursoDivision: '4to 1ra', emailTutores: 'padres.juan@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false },
        { usuario: 'alumno2', contraseña: 'alumno123', tipo: 'alumno', nombre: 'María García', cursoDivision: 'CB 2do 1ra', emailTutores: 'padres.maria@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false }
      ];
      
      for (const user of usuarios) {
        await setDoc(doc(window.db, 'usuarios', user.usuario), user);
      }
      console.log('Usuarios iniciales creados');
    }
  } catch (error) {
    console.error('Error al inicializar datos:', error);
  }
}

// Función para mostrar/ocultar formulario de registro
function toggleFormularioRegistro() {
  const formulario = document.getElementById('formularioRegistro');
  const btnTexto = document.getElementById('btnTextoRegistro');
  
  if (formulario.classList.contains('oculto')) {
    formulario.classList.remove('oculto');
    btnTexto.textContent = '✕ Cerrar Formulario';
  } else {
    formulario.classList.add('oculto');
    btnTexto.textContent = '➕ Registrar Alumno';
    // Limpiar campos al cerrar
    document.getElementById('nombreAlumno').value = '';
    document.getElementById('usuarioAlumno').value = '';
    document.getElementById('contraseñaAlumno').value = '';
    document.getElementById('emailTutores').value = '';
    document.getElementById('cursoAlumno').value = '';
    document.getElementById('divisionAlumno').value = '';
  }
}

// Obtener la fecha actual en formato YYYY-MM-DD
function getFechaActual() {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0];
}

// Obtener la fecha de mañana en formato YYYY-MM-DD
function getFechaMañana() {
  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  return mañana.toISOString().split('T')[0];
}

// Función para formatear fecha
function formatearFecha(fecha) {
  const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(fecha).toLocaleDateString('es-ES', opciones);
}

// Función para obtener la hora actual en formato HH:MM
function getHoraActual() {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

// Función para comparar si la hora actual es menor que una hora límite
function estaAntesDeHora(horaLimite) {
  const ahora = getHoraActual();
  return ahora < horaLimite;
}

// Función para verificar si puede inscribirse
async function puedeInscribirse() {
  const config = await obtenerConfiguracion();
  return estaAntesDeHora(config.horaLimiteInscripcion);
}

// Función para verificar si puede cancelar
async function puedeCancelar() {
  const config = await obtenerConfiguracion();
  return estaAntesDeHora(config.horaLimiteCancelacion);
}

// Obtener configuración de horarios
async function obtenerConfiguracion() {
  try {
    const { doc, getDocs, collection, setDoc } = window.firestore;
    const configRef = doc(window.db, 'configuracion', 'horarios');
    const configSnap = await getDocs(collection(window.db, 'configuracion'));
    
    let config = null;
    configSnap.forEach(doc => {
      if (doc.id === 'horarios') {
        config = doc.data();
      }
    });
    
    if (!config) {
      // Crear configuración por defecto
      config = {
        horaLimiteInscripcion: '23:00',
        horaLimiteCancelacion: '23:30'
      };
      await setDoc(configRef, config);
    }
    
    return config;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return {
      horaLimiteInscripcion: '23:00',
      horaLimiteCancelacion: '23:30'
    };
  }
}

async function login() {
  const usuario = document.getElementById('usuario').value;
  const contraseña = document.getElementById('contraseña').value;
  
  // Verificar que los campos no estén vacíos
  if (!usuario || !contraseña) {
    mostrarNotificacion('Por favor complete todos los campos', 'warning');
    return;
  }
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', usuario), where('contraseña', '==', contraseña));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        usuarioActual = { id: doc.id, ...doc.data() };
      });
      
      console.log('Usuario encontrado:', usuarioActual);
      
      document.getElementById('login').classList.add('oculto');
      
      if (usuarioActual.tipo === 'admin') {
        document.getElementById('menuAdmin').classList.remove('oculto');
        cargarInscripcionesComedor();
        cargarMenuDelDia();
        cargarListaAlumnos();
        cargarEstadisticasDia();
        cargarNotificaciones();
        cargarConfiguracionHorarios();
        mostrarNotificacion('Bienvenido, Administrador', 'success');
      } else {
        document.getElementById('menuAlumno').classList.remove('oculto');
        // Mostrar información del alumno
        document.getElementById('alumnoNombre').textContent = usuarioActual.nombre;
        document.getElementById('alumnoCurso').textContent = usuarioActual.cursoDivision || 'No especificado';
        
        verificarStrikes();
        cargarMenuAlumno();
        verificarInscripcionComedor();
        mostrarNotificacion(`Bienvenido, ${usuarioActual.nombre}`, 'success');
      }
    } else {
      console.log('Usuario no encontrado. Usuario ingresado:', usuario);
      mostrarNotificacion('Usuario o contraseña incorrectos', 'error');
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    mostrarNotificacion('Error al iniciar sesión', 'error');
  }
}

function logout() {
  usuarioActual = null;
  
  document.getElementById('menuAdmin').classList.add('oculto');
  document.getElementById('menuAlumno').classList.add('oculto');
  document.getElementById('login').classList.remove('oculto');
  
  // Limpiar campos
  document.getElementById('usuario').value = '';
  document.getElementById('contraseña').value = '';
}

async function registrarAlumno() {
  const nombre = document.getElementById('nombreAlumno').value;
  const usuario = document.getElementById('usuarioAlumno').value;
  const contraseña = document.getElementById('contraseñaAlumno').value;
  const emailTutores = document.getElementById('emailTutores').value;
  const curso = document.getElementById('cursoAlumno').value;
  const division = document.getElementById('divisionAlumno').value;
  
  if (!nombre || !usuario || !contraseña || !emailTutores || !curso || !division) {
    mostrarNotificacion('Por favor complete todos los campos', 'warning');
    return;
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailTutores)) {
    mostrarNotificacion('Por favor ingrese un email válido', 'error');
    return;
  }
  
  try {
    const { collection, getDocs, query, where, setDoc, doc } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', usuario));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      mostrarNotificacion('El usuario ya existe', 'error');
      return;
    }
    
    // Construir cursoDivision
    const cursoDivision = `${curso} ${division}`;
    
    // Agregar el nuevo alumno
    const nuevoAlumno = {
      usuario: usuario,
      contraseña: contraseña,
      tipo: 'alumno',
      nombre: nombre,
      cursoDivision: cursoDivision,
      emailTutores: emailTutores,
      strikes: 0,
      notificadoStrikes: false,
      bloqueado: false
    };
    
    await setDoc(doc(window.db, 'usuarios', usuario), nuevoAlumno);
    
    mostrarNotificacion('Alumno registrado con éxito', 'success');
    
    // Cerrar formulario
    toggleFormularioRegistro();
    
    // Actualizar lista de alumnos
    cargarListaAlumnos();
  } catch (error) {
    console.error('Error al registrar alumno:', error);
    mostrarNotificacion('Error al registrar alumno', 'error');
  }
}

// Función para actualizar divisiones disponibles según el curso
function actualizarDivisiones() {
  const curso = document.getElementById('cursoAlumno').value;
  const divisionSelect = document.getElementById('divisionAlumno');
  
  // Todas las divisiones tienen 1ra y 2da
  divisionSelect.innerHTML = `
    <option value="">Seleccionar división...</option>
    <option value="1ra">1ra</option>
    <option value="2da">2da</option>
  `;
}

async function cargarListaAlumnos() {
  try {
    // Inicializar filtros
    alumnosFiltrados = [];
    filtroActual = 'todos';
    document.getElementById('buscarAlumno').value = '';
    
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    const alumnos = [];
    snapshot.forEach((doc) => {
      alumnos.push({ id: doc.id, ...doc.data() });
    });
    
    alumnosFiltrados = alumnos;
    
    if (alumnos.length === 0) {
      document.getElementById('listaAlumnos').innerHTML = '<p>No hay alumnos registrados</p>';
      return;
    }
    
    // Mostrar todos los alumnos
    mostrarAlumnosFiltrados(alumnos);
  } catch (error) {
    console.error('Error al cargar alumnos:', error);
    mostrarNotificacion('Error al cargar alumnos', 'error');
  }
}

async function establecerMenuDelDia() {
  const menu = document.getElementById('menuDelDia').value;
  
  if (!menu) {
    mostrarNotificacion('Por favor ingrese el menú del día', 'warning');
    return;
  }
  
  try {
    const { doc, setDoc } = window.firestore;
    const menuRef = doc(window.db, 'menu', 'delDia');
    
    const menuDelDia = {
      fecha: getFechaActual(),
      menu: menu
    };
    
    await setDoc(menuRef, menuDelDia);
    
    // Actualizar la visualización
    cargarMenuDelDia();
    
    mostrarNotificacion('Menú del día establecido correctamente', 'success');
  } catch (error) {
    console.error('Error al establecer menú:', error);
    mostrarNotificacion('Error al establecer menú', 'error');
  }
}

async function cargarMenuDelDia() {
  try {
    const { doc, getDocs, collection } = window.firestore;
    const menuSnap = await getDocs(collection(window.db, 'menu'));
    
    let menuDelDia = null;
    menuSnap.forEach(doc => {
      if (doc.id === 'delDia') {
        menuDelDia = doc.data();
      }
    });
    
    const infoMenuDiv = document.getElementById('infoMenuDelDia');
    const textoMenu = document.getElementById('textoMenuDelDia');
    
    if (menuDelDia && menuDelDia.fecha === getFechaActual()) {
      infoMenuDiv.classList.remove('oculto');
      textoMenu.textContent = menuDelDia.menu;
    } else {
      infoMenuDiv.classList.add('oculto');
    }
  } catch (error) {
    console.error('Error al cargar menú:', error);
  }
}

async function cargarMenuAlumno() {
  const diaSeleccionado = document.getElementById('diaInscripcion') ? document.getElementById('diaInscripcion').value : 'hoy';
  await actualizarMenuSegunDia(diaSeleccionado);
}

async function actualizarMenuSegunDia(dia) {
  try {
    const { getDocs, collection } = window.firestore;
    const menuSnap = await getDocs(collection(window.db, 'menu'));
    
    let menuDelDia = null;
    menuSnap.forEach(doc => {
      if (doc.id === 'delDia') {
        menuDelDia = doc.data();
      }
    });
    
    const infoMenuDiv = document.getElementById('infoMenuAlumno');
    const textoMenu = document.getElementById('textoMenuAlumno');
    const tituloMenu = document.getElementById('tituloMenuAlumno');
    
    const fechaComparar = dia === 'hoy' ? getFechaActual() : getFechaMañana();
    const textoTitulo = dia === 'hoy' ? 'HOY' : 'MAÑANA';
    
    if (menuDelDia && menuDelDia.fecha === fechaComparar) {
      infoMenuDiv.classList.remove('oculto');
      textoMenu.textContent = menuDelDia.menu;
      tituloMenu.textContent = `🍽️ Menú de ${textoTitulo}:`;
    } else {
      infoMenuDiv.classList.add('oculto');
    }
  } catch (error) {
    console.error('Error al actualizar menú:', error);
  }
}

function cambiarDiaInscripcion() {
  const dia = document.getElementById('diaInscripcion').value;
  actualizarMenuSegunDia(dia);
}

async function inscribirComedor() {
  if (!usuarioActual) return;
  
  // Verificar si el alumno está bloqueado
  if (usuarioActual.bloqueado) {
    mostrarNotificacion('No puedes inscribirte al comedor. Has acumulado más de 3 faltas. Se ha notificado a tus tutores y debes esperar la validación del administrador.', 'error');
    return;
  }
  
  const hora = document.getElementById('horaComedor').value;
  const diaSeleccionado = document.getElementById('diaInscripcion').value;
  const fechaInscripcion = diaSeleccionado === 'hoy' ? getFechaActual() : getFechaMañana();
  const textoFecha = diaSeleccionado === 'hoy' ? 'HOY' : 'MAÑANA';
  
  try {
    // Verificar si hay menú establecido para el día seleccionado
    const { getDocs, collection, query, where, addDoc } = window.firestore;
    const menuSnap = await getDocs(collection(window.db, 'menu'));
    
    let menuGuardado = null;
    menuSnap.forEach(doc => {
      if (doc.id === 'delDia') {
        menuGuardado = doc.data();
      }
    });
    
    const hayMenu = menuGuardado && menuGuardado.fecha === fechaInscripcion;
    
    // Si no hay menú, preguntar al alumno
    if (!hayMenu) {
      const confirmar = confirm(
        '⚠️ AVISO IMPORTANTE\n\n' +
        `Aún no se ha establecido el menú para ${textoFecha}.\n\n` +
        '¿Estás seguro/a que querés anotarte igual?\n\n' +
        'Recordá que podés cancelar tu inscripción más tarde si cambias de opinión.'
      );
      
      if (!confirmar) {
        return;
      }
    }
    
    // Verificar si ya está inscrito para ese día
    const inscripcionesRef = collection(window.db, 'inscripciones');
    const q = query(inscripcionesRef, 
      where('usuario', '==', usuarioActual.usuario), 
      where('fecha', '==', fechaInscripcion)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      mostrarNotificacion(`Ya estás inscrito al comedor para ${textoFecha}`, 'warning');
      return;
    }
    
    // Registrar la inscripción
    await addDoc(inscripcionesRef, {
      usuario: usuarioActual.usuario,
      nombre: usuarioActual.nombre,
      cursoDivision: usuarioActual.cursoDivision,
      fecha: fechaInscripcion,
      hora: hora,
      presente: null
    });
    
    // Actualizar la interfaz
    verificarInscripcionComedor();
    
    mostrarNotificacion(`¡Listo! Te anotaste al comedor de ${textoFecha} para las ${hora}`, 'success');
  } catch (error) {
    console.error('Error al inscribir:', error);
    mostrarNotificacion('Error al inscribirse', 'error');
  }
}

async function verificarInscripcionComedor() {
  if (!usuarioActual) return;
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    
    const fechaHoy = getFechaActual();
    const fechaMañana = getFechaMañana();
    
    // Buscar inscripciones para hoy y mañana
    const qHoy = query(inscripcionesRef, 
      where('usuario', '==', usuarioActual.usuario), 
      where('fecha', '==', fechaHoy)
    );
    const qMañana = query(inscripcionesRef, 
      where('usuario', '==', usuarioActual.usuario), 
      where('fecha', '==', fechaMañana)
    );
    
    const snapshotHoy = await getDocs(qHoy);
    const snapshotMañana = await getDocs(qMañana);
    
    let inscripcionHoy = null;
    let inscripcionMañana = null;
    
    snapshotHoy.forEach(doc => {
      inscripcionHoy = { id: doc.id, ...doc.data() };
    });
    
    snapshotMañana.forEach(doc => {
      inscripcionMañana = { id: doc.id, ...doc.data() };
    });
    
    const inscripcionDiv = document.getElementById('inscripcionComedor');
    const infoInscripcionDiv = document.getElementById('infoInscripcionComedor');
    const horaInscritaSpan = document.getElementById('horaInscrita');
    const diaInscritoSpan = document.getElementById('diaInscrito');
    
    // Mostrar la inscripción más próxima
    let inscripcionActiva = inscripcionHoy || inscripcionMañana;
    
    if (inscripcionActiva) {
      inscripcionDiv.classList.add('oculto');
      infoInscripcionDiv.classList.remove('oculto');
      horaInscritaSpan.textContent = inscripcionActiva.hora;
      diaInscritoSpan.textContent = inscripcionHoy ? 'HOY' : 'MAÑANA';
    } else {
      inscripcionDiv.classList.remove('oculto');
      infoInscripcionDiv.classList.add('oculto');
    }
  } catch (error) {
    console.error('Error al verificar inscripción:', error);
  }
}

async function cargarInscripcionesComedor() {
  try {
    const fechaActual = getFechaActual();
    const { collection, getDocs, query, where } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    const q = query(inscripcionesRef, where('fecha', '==', fechaActual));
    const snapshot = await getDocs(q);
    
    const inscripcionesHoy = [];
    snapshot.forEach(doc => {
      inscripcionesHoy.push({ id: doc.id, ...doc.data() });
    });
    
    const listaInscripciones = document.getElementById('listaInscripcionesComedor');
    
    if (inscripcionesHoy.length === 0) {
      listaInscripciones.innerHTML = '<p>No hay inscripciones para hoy</p>';
      return;
    }
    
    let html = '<div class="comedor-list">';
    inscripcionesHoy.forEach(inscripcion => {
      const estado = inscripcion.presente === null ? 'Pendiente' : 
                    (inscripcion.presente ? 'Presente' : 'Ausente');
      
      const badgeClass = inscripcion.presente === null ? '' : 
                        (inscripcion.presente ? 'presente-badge' : 'ausente-badge');
      
      html += `
        <div class="comedor-item">
          <div>
            <strong>${inscripcion.nombre}</strong> 
            <div>${inscripcion.cursoDivision || 'Sin curso'} - ${inscripcion.hora}</div>
            <span class="status-badge ${badgeClass}">${estado}</span>
          </div>
          <div class="comedor-actions">
            ${inscripcion.presente === null ? `
              <button class="btn-success" onclick="marcarAsistenciaComedor('${inscripcion.id}', '${inscripcion.usuario}', true)">Presente</button>
              <button class="btn-danger" onclick="marcarAsistenciaComedor('${inscripcion.id}', '${inscripcion.usuario}', false)">Falta</button>
            ` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    listaInscripciones.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar inscripciones:', error);
  }
}

async function marcarAsistenciaComedor(inscripcionId, usuario, presente) {
  try {
    const { doc, updateDoc, getDocs, collection, query, where, setDoc, addDoc } = window.firestore;
    
    // Actualizar la inscripción
    const inscripcionRef = doc(window.db, 'inscripciones', inscripcionId);
    await updateDoc(inscripcionRef, { presente: presente });
    
    // Si el alumno falta, agregar un strike
    if (!presente) {
      const usuariosRef = collection(window.db, 'usuarios');
      const usuarioRef = doc(window.db, 'usuarios', usuario);
      const q = query(usuariosRef, where('usuario', '==', usuario));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        let alumno = null;
        snapshot.forEach(doc => {
          alumno = { id: doc.id, ...doc.data() };
        });
        
        const strikesActuales = (alumno.strikes || 0) + 1;
        
        // Actualizar strikes
        await updateDoc(usuarioRef, { strikes: strikesActuales });
        
        // Si llega a 3 strikes y no se ha notificado antes
        if (strikesActuales >= 3 && !alumno.notificadoStrikes) {
          await enviarNotificacionTutores(alumno);
          await updateDoc(usuarioRef, { 
            notificadoStrikes: true,
            bloqueado: true
          });
          mostrarNotificacion(`${alumno.nombre} ha sido bloqueado del comedor`, 'warning');
        }
        
        // Si es el usuario actual, actualizar la interfaz
        if (usuarioActual && usuarioActual.usuario === usuario) {
          usuarioActual.strikes = strikesActuales;
          verificarStrikes();
        }
      }
    } else {
      // Si el alumno está presente, actualizar la interfaz si es el usuario actual
      if (usuarioActual && usuarioActual.usuario === usuario) {
        verificarStrikes();
      }
    }
    
    // Recargar la lista y estadísticas
    cargarInscripcionesComedor();
    cargarEstadisticasDia();
    cargarListaAlumnos();
  } catch (error) {
    console.error('Error al marcar asistencia:', error);
    mostrarNotificacion('Error al marcar asistencia', 'error');
  }
}

function verificarStrikes() {
  if (!usuarioActual || usuarioActual.tipo !== 'alumno') return;
  
  const strikes = usuarioActual.strikes || 0;
  const bloqueado = usuarioActual.bloqueado || false;
  const strikesInfo = document.getElementById('strikesInfo');
  const strikesMessage = document.getElementById('strikesMessage');
  
  if (strikes > 0 || bloqueado) {
    strikesInfo.classList.remove('oculto');
    
    if (bloqueado) {
      strikesMessage.innerHTML = `🔒 <strong>CUENTA BLOQUEADA:</strong> Has acumulado ${strikes} faltas en el comedor. Se ha notificado a tus padres/tutores. No podrás inscribirte al comedor hasta que el administrador valide tu cuenta después de recibir la confirmación de tus tutores.`;
      strikesInfo.style.backgroundColor = '#ffe0e0';
      strikesInfo.style.borderColor = '#cc0000';
    } else if (strikes === 1) {
      strikesMessage.textContent = 'Tienes 1 falta en el comedor. Te quedan 2 faltas antes de que se notifique a tus padres/tutores por email.';
      strikesInfo.style.backgroundColor = '#fff4e5';
      strikesInfo.style.borderColor = 'var(--warning)';
    } else if (strikes === 2) {
      strikesMessage.textContent = 'Tienes 2 faltas en el comedor. Te queda 1 falta antes de que se notifique a tus padres/tutores por email.';
      strikesInfo.style.backgroundColor = '#fff4e5';
      strikesInfo.style.borderColor = 'var(--warning)';
    } else if (strikes >= 3) {
      strikesMessage.textContent = `Tienes ${strikes} faltas en el comedor. Se ha notificado a tus padres/tutores al email registrado.`;
      strikesInfo.style.backgroundColor = '#ffe0e0';
      strikesInfo.style.borderColor = '#cc0000';
    }
  } else {
    strikesInfo.classList.add('oculto');
  }
}

// Función para cancelar inscripción al comedor
async function cancelarInscripcionComedor() {
  if (!usuarioActual) return;
  
  try {
    const { collection, getDocs, query, where, deleteDoc, doc } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    
    const fechaHoy = getFechaActual();
    const fechaMañana = getFechaMañana();
    
    // Buscar inscripción activa
    const qHoy = query(inscripcionesRef, 
      where('usuario', '==', usuarioActual.usuario), 
      where('fecha', '==', fechaHoy)
    );
    const qMañana = query(inscripcionesRef, 
      where('usuario', '==', usuarioActual.usuario), 
      where('fecha', '==', fechaMañana)
    );
    
    const snapshotHoy = await getDocs(qHoy);
    const snapshotMañana = await getDocs(qMañana);
    
    let inscripcionId = null;
    let diaTexto = '';
    
    if (!snapshotHoy.empty) {
      snapshotHoy.forEach(doc => {
        inscripcionId = doc.id;
      });
      diaTexto = 'hoy';
    } else if (!snapshotMañana.empty) {
      snapshotMañana.forEach(doc => {
        inscripcionId = doc.id;
      });
      diaTexto = 'mañana';
    }
    
    if (inscripcionId) {
      const inscripcionRef = doc(window.db, 'inscripciones', inscripcionId);
      await deleteDoc(inscripcionRef);
      
      // Actualizar la interfaz
      verificarInscripcionComedor();
      
      mostrarNotificacion(`Inscripción cancelada. Ya no estás anotado/a para ${diaTexto}.`, 'success');
    }
  } catch (error) {
    console.error('Error al cancelar inscripción:', error);
    mostrarNotificacion('Error al cancelar inscripción', 'error');
  }
}

// Función para filtrar alumnos por texto
async function filtrarAlumnos() {
  const busqueda = document.getElementById('buscarAlumno').value.toLowerCase();
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    const alumnos = [];
    snapshot.forEach(doc => {
      alumnos.push({ id: doc.id, ...doc.data() });
    });
    
    alumnosFiltrados = alumnos.filter(alumno => 
      alumno.nombre.toLowerCase().includes(busqueda) || 
      alumno.usuario.toLowerCase().includes(busqueda) ||
      (alumno.cursoDivision && alumno.cursoDivision.toLowerCase().includes(busqueda))
    );
    
    aplicarFiltroStrikes();
  } catch (error) {
    console.error('Error al filtrar alumnos:', error);
  }
}

// Función para filtrar por strikes
async function filtrarPorStrikes(tipo) {
  filtroActual = tipo;
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    alumnosFiltrados = [];
    snapshot.forEach(doc => {
      alumnosFiltrados.push({ id: doc.id, ...doc.data() });
    });
    
    aplicarFiltroStrikes();
  } catch (error) {
    console.error('Error al filtrar por strikes:', error);
  }
}

// Aplicar filtro de strikes
function aplicarFiltroStrikes() {
  let alumnosParaMostrar = alumnosFiltrados;
  
  if (filtroActual === 'con-strikes') {
    alumnosParaMostrar = alumnosFiltrados.filter(alumno => (alumno.strikes || 0) > 0);
  } else if (filtroActual === 'sin-strikes') {
    alumnosParaMostrar = alumnosFiltrados.filter(alumno => (alumno.strikes || 0) === 0);
  }
  
  mostrarAlumnosFiltrados(alumnosParaMostrar);
}

// Mostrar alumnos filtrados
function mostrarAlumnosFiltrados(alumnos) {
  const listaAlumnosDiv = document.getElementById('listaAlumnos');
  
  if (alumnos.length === 0) {
    listaAlumnosDiv.innerHTML = '<p>No se encontraron alumnos que coincidan con los filtros</p>';
    return;
  }
  
  let html = '<div class="comedor-list">';
  alumnos.forEach(alumno => {
    const strikes = alumno.strikes || 0;
    const strikeClass = strikes > 0 ? 'ausente-badge' : 'presente-badge';
    const strikeText = strikes > 0 ? `${strikes} falta${strikes > 1 ? 's' : ''}` : 'Sin faltas';
    
    const bloqueadoTag = alumno.bloqueado ? '<span class="status-badge ausente-badge" style="background: rgba(255, 0, 0, 0.2); color: #cc0000;">🔒 BLOQUEADO</span>' : '';
    
    html += `
      <div class="comedor-item">
        <div>
          <strong>${alumno.nombre}</strong> ${bloqueadoTag}
          <div>Usuario: ${alumno.usuario}</div>
          <div>Curso: ${alumno.cursoDivision || 'No especificado'}</div>
          <div>Email Tutores: ${alumno.emailTutores || 'No especificado'}</div>
          <div>Faltas: <span class="status-badge ${strikeClass}">${strikeText}</span></div>
        </div>
        <div class="comedor-actions">
          ${alumno.bloqueado ? 
            `<button class="btn-success" onclick="validarAlumno('${alumno.usuario}')">✓ Validar Alumno</button>` : 
            `<button class="btn-warning" onclick="resetearStrikes('${alumno.usuario}')">↺ Resetear Faltas</button>`
          }
          <button class="btn-danger" onclick="eliminarAlumno('${alumno.usuario}')">🗑️ Eliminar</button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  listaAlumnosDiv.innerHTML = html;
}

// Función para resetear strikes de un alumno
async function resetearStrikes(usuario) {
  if (confirm('¿Estás seguro de que quieres resetear las faltas de este alumno?')) {
    try {
      const { doc, updateDoc } = window.firestore;
      const usuarioRef = doc(window.db, 'usuarios', usuario);
      
      await updateDoc(usuarioRef, {
        strikes: 0,
        notificadoStrikes: false,
        bloqueado: false
      });
      
      // Actualizar la lista
      filtrarAlumnos();
      mostrarNotificacion('Faltas del alumno reseteadas correctamente', 'success');
    } catch (error) {
      console.error('Error al resetear strikes:', error);
      mostrarNotificacion('Error al resetear faltas', 'error');
    }
  }
}

// Función para validar alumno (desbloquear después de respuesta de tutores)
async function validarAlumno(usuario) {
  if (confirm('¿Has recibido la confirmación de los tutores para validar a este alumno?')) {
    try {
      const { doc, updateDoc, getDocs, collection, query, where } = window.firestore;
      const usuarioRef = doc(window.db, 'usuarios', usuario);
      
      await updateDoc(usuarioRef, {
        bloqueado: false,
        strikes: 0,
        notificadoStrikes: false
      });
      
      // Obtener nombre del alumno
      const usuariosRef = collection(window.db, 'usuarios');
      const q = query(usuariosRef, where('usuario', '==', usuario));
      const snapshot = await getDocs(q);
      
      let nombreAlumno = '';
      snapshot.forEach(doc => {
        nombreAlumno = doc.data().nombre;
      });
      
      // Actualizar la lista
      filtrarAlumnos();
      mostrarNotificacion(`${nombreAlumno} ha sido validado y desbloqueado correctamente`, 'success');
    } catch (error) {
      console.error('Error al validar alumno:', error);
      mostrarNotificacion('Error al validar alumno', 'error');
    }
  }
}

// Función para eliminar un alumno
async function eliminarAlumno(usuario) {
  if (confirm('¿Estás seguro de que quieres eliminar este alumno? Esta acción no se puede deshacer.')) {
    try {
      const { doc, deleteDoc, getDocs, collection, query, where } = window.firestore;
      
      // Obtener el nombre antes de eliminar
      const usuariosRef = collection(window.db, 'usuarios');
      const q = query(usuariosRef, where('usuario', '==', usuario));
      const snapshot = await getDocs(q);
      
      let nombreAlumno = '';
      snapshot.forEach(doc => {
        nombreAlumno = doc.data().nombre;
      });
      
      // Eliminar el usuario
      const usuarioRef = doc(window.db, 'usuarios', usuario);
      await deleteDoc(usuarioRef);
      
      // También eliminar sus inscripciones al comedor
      const inscripcionesRef = collection(window.db, 'inscripciones');
      const qInscripciones = query(inscripcionesRef, where('usuario', '==', usuario));
      const inscripcionesSnap = await getDocs(qInscripciones);
      
      const deletePromises = [];
      inscripcionesSnap.forEach(doc => {
        deletePromises.push(deleteDoc(doc.ref));
      });
      await Promise.all(deletePromises);
      
      // Actualizar la lista
      filtrarAlumnos();
      cargarInscripcionesComedor();
      cargarEstadisticasDia();
      mostrarNotificacion(`${nombreAlumno} ha sido eliminado del sistema`, 'success');
    } catch (error) {
      console.error('Error al eliminar alumno:', error);
      mostrarNotificacion('Error al eliminar alumno', 'error');
    }
  }
}

// Función para mostrar notificaciones elegantes
function mostrarNotificacion(mensaje, tipo = 'success') {
  // Crear elemento de notificación
  const notification = document.createElement('div');
  notification.className = `notification ${tipo}`;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span>${mensaje}</span>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #666; cursor: pointer; font-size: 18px;">&times;</button>
    </div>
  `;
  
  // Agregar al DOM
  document.body.appendChild(notification);
  
  // Mostrar con animación
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 300);
  }, 4000);
}

// Función para enviar notificación a tutores
async function enviarNotificacionTutores(alumno) {
  try {
    const { collection, addDoc } = window.firestore;
    const notificacionesRef = collection(window.db, 'notificaciones');
    
    const nuevaNotificacion = {
      fecha: new Date().toISOString(),
      alumno: alumno.nombre,
      usuario: alumno.usuario,
      emailTutores: alumno.emailTutores,
      strikes: alumno.strikes,
      mensaje: `Estimados padres/tutores de ${alumno.nombre}: Les informamos que su hijo/a ha acumulado ${alumno.strikes} faltas en el comedor escolar. Por favor, comuníquese con la institución para más información.`
    };
    
    await addDoc(notificacionesRef, nuevaNotificacion);
    
    console.log('📧 Notificación enviada a:', alumno.emailTutores);
    console.log('Mensaje:', nuevaNotificacion.mensaje);
    
    mostrarNotificacion(`Notificación enviada a tutores de ${alumno.nombre}`, 'success');
  } catch (error) {
    console.error('Error al enviar notificación:', error);
  }
}

// Función para cargar estadísticas del día
async function cargarEstadisticasDia() {
  try {
    const fechaActual = getFechaActual();
    const { collection, getDocs, query, where } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    const q = query(inscripcionesRef, where('fecha', '==', fechaActual));
    const snapshot = await getDocs(q);
    
    const inscripcionesHoy = [];
    snapshot.forEach(doc => {
      inscripcionesHoy.push(doc.data());
    });
    
    const presentes = inscripcionesHoy.filter(i => i.presente === true).length;
    const ausentes = inscripcionesHoy.filter(i => i.presente === false).length;
    const pendientes = inscripcionesHoy.filter(i => i.presente === null).length;
    const total = inscripcionesHoy.length;
    
    const estadisticasDiv = document.getElementById('estadisticasDia');
    
    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
        <div class="stats-card">
          <div class="stats-number">${total}</div>
          <div class="stats-label">Total Inscritos</div>
        </div>
        <div class="stats-card" style="background: linear-gradient(135deg, var(--success), #3a9fc9);">
          <div class="stats-number">${presentes}</div>
          <div class="stats-label">Presentes</div>
        </div>
        <div class="stats-card" style="background: linear-gradient(135deg, var(--danger), #c41a6b);">
          <div class="stats-number">${ausentes}</div>
          <div class="stats-label">Ausentes</div>
        </div>
        <div class="stats-card" style="background: linear-gradient(135deg, var(--warning), #cc7f00);">
          <div class="stats-number">${pendientes}</div>
          <div class="stats-label">Pendientes</div>
        </div>
      </div>
    `;
    
    estadisticasDiv.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

// Función para cargar notificaciones enviadas
async function cargarNotificaciones() {
  try {
    const { collection, getDocs } = window.firestore;
    const notificacionesRef = collection(window.db, 'notificaciones');
    const snapshot = await getDocs(notificacionesRef);
    
    const notificaciones = [];
    snapshot.forEach(doc => {
      notificaciones.push({ id: doc.id, ...doc.data() });
    });
    
    const listaNotificaciones = document.getElementById('listaNotificaciones');
    
    if (notificaciones.length === 0) {
      listaNotificaciones.innerHTML = '<p>No se han enviado notificaciones</p>';
      return;
    }
    
    // Ordenar por fecha más reciente
    notificaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    let html = '<div class="comedor-list">';
    notificaciones.forEach(notif => {
      const fecha = new Date(notif.fecha);
      const fechaFormateada = fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      html += `
        <div class="comedor-item" style="flex-direction: column; align-items: flex-start;">
          <div style="width: 100%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>📧 ${notif.alumno}</strong>
              <span class="status-badge ausente-badge">${notif.strikes} faltas</span>
            </div>
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">
              <strong>Email:</strong> ${notif.emailTutores}
            </div>
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">
              <strong>Fecha:</strong> ${fechaFormateada}
            </div>
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 14px;">
              ${notif.mensaje}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    listaNotificaciones.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar notificaciones:', error);
  }
}

// Función para cargar configuración de horarios
async function cargarConfiguracionHorarios() {
  try {
    const config = await obtenerConfiguracion();
    document.getElementById('horaLimiteInscripcion').value = config.horaLimiteInscripcion;
    document.getElementById('horaLimiteCancelacion').value = config.horaLimiteCancelacion;
  } catch (error) {
    console.error('Error al cargar configuración de horarios:', error);
  }
}

// Función para guardar configuración de horarios
async function guardarConfiguracionHorarios() {
  const horaInscripcion = document.getElementById('horaLimiteInscripcion').value;
  const horaCancelacion = document.getElementById('horaLimiteCancelacion').value;
  
  if (!horaInscripcion || !horaCancelacion) {
    mostrarNotificacion('Por favor complete ambos horarios', 'warning');
    return;
  }
  
  if (horaCancelacion <= horaInscripcion) {
    mostrarNotificacion('La hora límite de cancelación debe ser posterior a la hora límite de inscripción', 'error');
    return;
  }
  
  try {
    const { doc, setDoc } = window.firestore;
    const configRef = doc(window.db, 'configuracion', 'horarios');
    
    const config = {
      horaLimiteInscripcion: horaInscripcion,
      horaLimiteCancelacion: horaCancelacion
    };
    
    await setDoc(configRef, config);
    mostrarNotificacion('Configuración de horarios guardada correctamente', 'success');
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    mostrarNotificacion('Error al guardar configuración', 'error');
  }
}
