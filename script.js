// Variables globales
let usuarioActual = null;
let alumnosFiltrados = [];
let filtroActual = 'todos';
let filtroOrientacion = 'todas'; // 'todas', 'INF', 'MEC'
let datosExcelImportados = null; // Para almacenar datos del Excel antes de importar

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
        { usuario: 'admin', contraseña: 'ADMIN25cet1', tipo: 'admin' },
        { usuario: 'alumno1', contraseña: 'alumno123', tipo: 'alumno', nombre: 'Juan Pérez', cursoDivision: '4to 1ra', emailTutores: 'padres.juan@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false },
        { usuario: 'alumno2', contraseña: 'alumno123', tipo: 'alumno', nombre: 'María García', cursoDivision: 'CB 2do 1ra', emailTutores: 'padres.maria@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false }
      ];
      
      for (const user of usuarios) {
        await setDoc(doc(window.db, 'usuarios', user.usuario), user);
      }
      console.log('Usuarios iniciales creados');
      console.log('🔐 CREDENCIALES DE ADMINISTRADOR:');
      console.log('Usuario: admin');
      console.log('Contraseña: ADMIN25cet1');
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
    document.getElementById('cicloAlumno').value = '';
    document.getElementById('cursoAlumno').innerHTML = '<option value="">Seleccionar curso...</option>';
    document.getElementById('orientacionAlumno').innerHTML = '<option value="">Seleccionar orientación...</option>';
    document.getElementById('divisionAlumno').innerHTML = '<option value="">Seleccionar división...</option>';
    document.getElementById('cursoGroup').style.display = 'none';
    document.getElementById('orientacionGroup').style.display = 'none';
    document.getElementById('divisionGroup').style.display = 'none';
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

// Función para verificar si ya pasaron los horarios de almuerzo del día
// El último horario es 13:00, así que después de las 13:00 no se puede inscribir
function hanPasadoHorariosAlmuerzo() {
  const horaActual = getHoraActual();
  // El último horario de almuerzo es 13:00, así que después de las 13:30 no se puede inscribir
  // (damos 30 minutos de margen después del último horario)
  return horaActual >= '13:30';
}

// Función para verificar si se puede inscribir hoy
function puedeInscribirseHoy() {
  if (hanPasadoHorariosAlmuerzo()) {
    return false;
  }
  return true;
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
  const usuario = document.getElementById('usuario').value.trim();
  const contraseña = document.getElementById('contraseña').value;
  
  // Verificar que los campos no estén vacíos
  if (!usuario || !contraseña) {
    mostrarNotificacion('Por favor complete todos los campos', 'warning');
    return;
  }
  
  try {
    const { collection, getDocs, query, where, doc, getDoc } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', usuario), where('contraseña', '==', contraseña));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        usuarioActual = { id: doc.id, ...doc.data() };
      });
      
      // Recargar datos completos del usuario para asegurar que tenemos la información más reciente
      const usuarioRef = doc(window.db, 'usuarios', usuarioActual.usuario);
      const usuarioSnap = await getDoc(usuarioRef);
      if (usuarioSnap.exists()) {
        usuarioActual = { id: usuarioSnap.id, ...usuarioSnap.data() };
      }
      
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
        cargarAlumnosParaNotificaciones(); // Cargar alumnos en el select de notificaciones
        mostrarNotificacion('Bienvenido, Administrador', 'success');
      } else {
        document.getElementById('menuAlumno').classList.remove('oculto');
        // Mostrar información del alumno
        document.getElementById('alumnoNombre').textContent = usuarioActual.nombre;
        document.getElementById('alumnoCurso').textContent = usuarioActual.cursoDivision || 'No especificado';
        
        // Verificar si ya modificó sus credenciales
        verificarEstadoModificacionCuenta();
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
  const ciclo = document.getElementById('cicloAlumno').value;
  const curso = document.getElementById('cursoAlumno').value;
  const orientacion = document.getElementById('orientacionAlumno').value;
  const division = document.getElementById('divisionAlumno').value;
  
  // Validar campos básicos
  if (!nombre || !usuario || !contraseña || !emailTutores || !ciclo || !curso || !division) {
    mostrarNotificacion('Por favor complete todos los campos obligatorios', 'warning');
    return;
  }
  
  // Validar que si es CS, tenga orientación
  if (ciclo === 'CS' && !orientacion) {
    mostrarNotificacion('Por favor seleccione una orientación para Ciclo Superior', 'warning');
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
    
    // Construir cursoDivision con formato correcto: "2°3° CB" o "2°3° CS INF"
    let cursoDivision = '';
    if (ciclo === 'CB') {
      cursoDivision = `${curso}°${division}° CB`;
    } else if (ciclo === 'CS') {
      cursoDivision = `${curso}°${division}° CS ${orientacion}`;
    } else {
      cursoDivision = `${curso}°${division}°`;
    }
    
    // Agregar el nuevo alumno con todos los campos
    const nuevoAlumno = {
      usuario: usuario,
      contraseña: contraseña,
      tipo: 'alumno',
      nombre: nombre,
      cursoDivision: cursoDivision,
      ciclo: ciclo,
      curso: curso,
      orientacion: ciclo === 'CS' ? orientacion : '',
      division: division,
      emailTutores: emailTutores,
      strikes: 0,
      notificadoStrikes: false,
      bloqueado: false,
      credencialesModificadas: false
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

// Función para actualizar cursos disponibles según el ciclo
function actualizarCursos() {
  const ciclo = document.getElementById('cicloAlumno').value;
  const cursoSelect = document.getElementById('cursoAlumno');
  const cursoGroup = document.getElementById('cursoGroup');
  const orientacionGroup = document.getElementById('orientacionGroup');
  const divisionGroup = document.getElementById('divisionGroup');
  
  // Limpiar campos dependientes
  cursoSelect.innerHTML = '<option value="">Seleccionar curso...</option>';
  document.getElementById('orientacionAlumno').innerHTML = '<option value="">Seleccionar orientación...</option>';
  document.getElementById('divisionAlumno').innerHTML = '<option value="">Seleccionar división...</option>';
  orientacionGroup.style.display = 'none';
  divisionGroup.style.display = 'none';
  
  if (!ciclo) {
    cursoGroup.style.display = 'none';
    return;
  }
  
  cursoGroup.style.display = 'block';
  
  if (ciclo === 'CB') {
    // Ciclo Básico: 1° y 2°
    cursoSelect.innerHTML = `
      <option value="">Seleccionar curso...</option>
      <option value="1">1°</option>
      <option value="2">2°</option>
    `;
  } else if (ciclo === 'CS') {
    // Ciclo Superior: 1° a 4°
    cursoSelect.innerHTML = `
      <option value="">Seleccionar curso...</option>
      <option value="1">1°</option>
      <option value="2">2°</option>
      <option value="3">3°</option>
      <option value="4">4°</option>
    `;
  }
}

// Función para actualizar orientación según el curso (solo CS)
function actualizarOrientacionYDivisiones() {
  const ciclo = document.getElementById('cicloAlumno').value;
  const curso = document.getElementById('cursoAlumno').value;
  const orientacionSelect = document.getElementById('orientacionAlumno');
  const orientacionGroup = document.getElementById('orientacionGroup');
  const divisionGroup = document.getElementById('divisionGroup');
  
  // Limpiar campos dependientes
  orientacionSelect.innerHTML = '<option value="">Seleccionar orientación...</option>';
  document.getElementById('divisionAlumno').innerHTML = '<option value="">Seleccionar división...</option>';
  divisionGroup.style.display = 'none';
  
  if (ciclo === 'CB') {
    // CB no tiene orientación
    orientacionGroup.style.display = 'none';
    actualizarDivisiones();
    return;
  }
  
  if (ciclo === 'CS' && curso) {
    // CS tiene orientaciones
    orientacionGroup.style.display = 'block';
    orientacionSelect.innerHTML = `
      <option value="">Seleccionar orientación...</option>
      <option value="INF">Informática (INF)</option>
      <option value="MEC">Mecánica (MEC)</option>
    `;
  } else {
    orientacionGroup.style.display = 'none';
  }
}

// Función para actualizar divisiones disponibles según el curso, ciclo y orientación
function actualizarDivisiones() {
  const ciclo = document.getElementById('cicloAlumno').value;
  const curso = document.getElementById('cursoAlumno').value;
  const orientacion = document.getElementById('orientacionAlumno').value;
  const divisionSelect = document.getElementById('divisionAlumno');
  const divisionGroup = document.getElementById('divisionGroup');
  
  if (!ciclo || !curso) {
    divisionGroup.style.display = 'none';
    return;
  }
  
  divisionGroup.style.display = 'block';
  
  if (ciclo === 'CB') {
    // CB: hasta 4 divisiones
    divisionSelect.innerHTML = `
      <option value="">Seleccionar división...</option>
      <option value="1">1°</option>
      <option value="2">2°</option>
      <option value="3">3°</option>
      <option value="4">4°</option>
    `;
  } else if (ciclo === 'CS') {
    if (curso === '1') {
      // 1° CS: 3 divisiones (INF y MEC)
      divisionSelect.innerHTML = `
        <option value="">Seleccionar división...</option>
        <option value="1">1°</option>
        <option value="2">2°</option>
        <option value="3">3°</option>
      `;
    } else {
      // 2°, 3°, 4° CS: 2 divisiones (INF y MEC)
      divisionSelect.innerHTML = `
        <option value="">Seleccionar división...</option>
        <option value="1">1°</option>
        <option value="2">2°</option>
      `;
    }
  }
}

async function cargarListaAlumnos() {
  try {
    // Inicializar filtros
    alumnosFiltrados = [];
    filtroActual = 'todos';
    filtroOrientacion = 'todas';
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
    
    // Aplicar todos los filtros antes de mostrar
    aplicarTodosLosFiltros();
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
  
  // Validar que no haya pasado el horario de almuerzo
  if (hanPasadoHorariosAlmuerzo()) {
    const confirmar = confirm(
      '⚠️ AVISO\n\n' +
      'Ya pasaron los horarios de almuerzo del día de hoy.\n\n' +
      '¿Estás seguro de que quieres establecer el menú para hoy de todas formas?'
    );
    
    if (!confirmar) {
      return;
    }
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
    // Validar horarios: no permitir inscribirse para hoy si ya pasaron los horarios de almuerzo
    if (diaSeleccionado === 'hoy' && !puedeInscribirseHoy()) {
      mostrarNotificacion('Ya pasaron los horarios de almuerzo del día. Solo puedes inscribirte para mañana.', 'warning');
      return;
    }
    
    // Verificar si ya asistió hoy (si está intentando inscribirse para hoy)
    if (diaSeleccionado === 'hoy') {
      const { collection, getDocs, query, where } = window.firestore;
      const inscripcionesRef = collection(window.db, 'inscripciones');
      const qHoy = query(inscripcionesRef, 
        where('usuario', '==', usuarioActual.usuario), 
        where('fecha', '==', getFechaActual())
      );
      const snapshotHoy = await getDocs(qHoy);
      
      snapshotHoy.forEach(doc => {
        const inscripcion = doc.data();
        if (inscripcion.presente === true) {
          mostrarNotificacion('Ya asististe al comedor hoy. Solo puedes inscribirte para mañana.', 'warning');
          return;
        }
      });
    }
    
    // Verificar si hay menú establecido para el día seleccionado
    const { getDocs, collection, query, where, addDoc, doc, updateDoc } = window.firestore;
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
      // Si ya existe, actualizar el horario
      snapshot.forEach(async (docSnap) => {
        const inscripcionExistente = docSnap.data();
        if (inscripcionExistente.presente === null) {
          // Solo actualizar si aún no se marcó asistencia
          const inscripcionRef = doc(window.db, 'inscripciones', docSnap.id);
          await updateDoc(inscripcionRef, { 
            hora: hora,
            fechaActualizacion: new Date().toISOString()
          });
          mostrarNotificacion(`Horario actualizado para ${textoFecha} a las ${hora}`, 'success');
        } else {
          mostrarNotificacion(`Ya estás inscrito al comedor para ${textoFecha} y tu asistencia ya fue registrada`, 'warning');
        }
      });
      verificarInscripcionComedor();
      return;
    }
    
    // Registrar la inscripción con horario individual
    await addDoc(inscripcionesRef, {
      usuario: usuarioActual.usuario,
      nombre: usuarioActual.nombre,
      cursoDivision: usuarioActual.cursoDivision,
      fecha: fechaInscripcion,
      hora: hora,
      presente: null,
      fechaInscripcion: new Date().toISOString()
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
    
    // Si hay inscripción para hoy
    if (inscripcionHoy) {
      // Si ya fue marcado como presente, ocultar la inscripción (ya asistió hoy)
      // El alumno solo podrá inscribirse al día siguiente
      if (inscripcionHoy.presente === true) {
        inscripcionDiv.classList.remove('oculto');
        infoInscripcionDiv.classList.add('oculto');
        // Mostrar mensaje indicando que ya asistió hoy
        const mensajeAsistencia = document.createElement('div');
        mensajeAsistencia.className = 'alert alert-success';
        mensajeAsistencia.innerHTML = '✅ Ya asististe al comedor hoy. Puedes inscribirte nuevamente mañana.';
        mensajeAsistencia.id = 'mensajeAsistenciaHoy';
        
        // Remover mensaje anterior si existe
        const mensajeAnterior = document.getElementById('mensajeAsistenciaHoy');
        if (mensajeAnterior) {
          mensajeAnterior.remove();
        }
        
        // Insertar mensaje después del título del comedor
        const comedorSection = document.querySelector('.comedor-section');
        if (comedorSection && !document.getElementById('mensajeAsistenciaHoy')) {
          const tituloComedor = comedorSection.querySelector('h3');
          if (tituloComedor && tituloComedor.nextSibling) {
            comedorSection.insertBefore(mensajeAsistencia, tituloComedor.nextSibling);
          } else {
            comedorSection.appendChild(mensajeAsistencia);
          }
        }
        
        // Cambiar el selector de día para que solo muestre mañana
        const diaSelect = document.getElementById('diaInscripcion');
        if (diaSelect) {
          diaSelect.innerHTML = '<option value="mañana">Mañana</option>';
        }
      } else if (inscripcionHoy.presente === false) {
        // Si fue marcado como ausente, mostrar la inscripción pero con mensaje
        inscripcionDiv.classList.add('oculto');
        infoInscripcionDiv.classList.remove('oculto');
        horaInscritaSpan.textContent = inscripcionHoy.hora;
        diaInscritoSpan.textContent = 'HOY';
      } else {
        // Pendiente (aún no se marcó asistencia)
        inscripcionDiv.classList.add('oculto');
        infoInscripcionDiv.classList.remove('oculto');
        horaInscritaSpan.textContent = inscripcionHoy.hora;
        diaInscritoSpan.textContent = 'HOY';
      }
    } else if (inscripcionMañana) {
      // Si hay inscripción para mañana pero no para hoy
      inscripcionDiv.classList.add('oculto');
      infoInscripcionDiv.classList.remove('oculto');
      horaInscritaSpan.textContent = inscripcionMañana.hora;
      diaInscritoSpan.textContent = 'MAÑANA';
    } else {
      // No hay inscripciones
      inscripcionDiv.classList.remove('oculto');
      infoInscripcionDiv.classList.add('oculto');
      
      // Remover mensaje de asistencia si existe
      const mensajeAsistencia = document.getElementById('mensajeAsistenciaHoy');
      if (mensajeAsistencia) {
        mensajeAsistencia.remove();
      }
      
      // Restaurar selector de día pero deshabilitar "hoy" si ya pasaron los horarios
      const diaSelect = document.getElementById('diaInscripcion');
      if (diaSelect) {
        if (hanPasadoHorariosAlmuerzo()) {
          // Si ya pasaron los horarios, solo mostrar mañana
          diaSelect.innerHTML = '<option value="mañana">Mañana</option>';
          // Mostrar mensaje informativo
          const mensajeHorario = document.createElement('div');
          mensajeHorario.className = 'alert alert-warning';
          mensajeHorario.innerHTML = '⏰ Ya pasaron los horarios de almuerzo del día. Solo puedes inscribirte para mañana.';
          mensajeHorario.id = 'mensajeHorarioPasado';
          
          const mensajeAnterior = document.getElementById('mensajeHorarioPasado');
          if (mensajeAnterior) {
            mensajeAnterior.remove();
          }
          
          const comedorSection = document.querySelector('.comedor-section');
          if (comedorSection && !document.getElementById('mensajeHorarioPasado')) {
            const tituloComedor = comedorSection.querySelector('h3');
            if (tituloComedor && tituloComedor.nextSibling) {
              comedorSection.insertBefore(mensajeHorario, tituloComedor.nextSibling);
            } else {
              comedorSection.appendChild(mensajeHorario);
            }
          }
        } else {
          diaSelect.innerHTML = `
            <option value="hoy">Hoy</option>
            <option value="mañana">Mañana</option>
          `;
          // Remover mensaje de horario pasado si existe
          const mensajeHorario = document.getElementById('mensajeHorarioPasado');
          if (mensajeHorario) {
            mensajeHorario.remove();
          }
        }
      }
    }
  } catch (error) {
    console.error('Error al verificar inscripción:', error);
  }
}

// Función auxiliar para obtener clave de agrupación
function obtenerClaveGrupo(alumno) {
  const ciclo = alumno.ciclo || '';
  const curso = alumno.curso || '';
  const orientacion = alumno.orientacion || '';
  const division = alumno.division || '';
  
  if (ciclo === 'CB') {
    return `CB-${curso}-${division}`;
  } else if (ciclo === 'CS') {
    return `CS-${curso}-${orientacion}-${division}`;
  }
  
  // Fallback: usar cursoDivision si está disponible
  return alumno.cursoDivision || 'Sin curso';
}

// Función auxiliar para obtener nombre de grupo (formato corto para dropdown)
// Formato: "1° 2° CB" o "2° 1° CS INF"
function obtenerNombreGrupo(alumno) {
  const ciclo = alumno.ciclo || '';
  const curso = alumno.curso || '';
  const orientacion = alumno.orientacion || '';
  const division = alumno.division || '';
  
  if (ciclo === 'CB') {
    return `${curso}° ${division}° CB`;
  } else if (ciclo === 'CS') {
    return `${curso}° ${division}° CS ${orientacion}`;
  }
  
  return alumno.cursoDivision || 'Sin curso';
}

// Función auxiliar para obtener nombre completo de grupo
function obtenerNombreGrupoCompleto(alumno) {
  const ciclo = alumno.ciclo || '';
  const curso = alumno.curso || '';
  const orientacion = alumno.orientacion || '';
  const division = alumno.division || '';
  
  if (ciclo === 'CB') {
    return `Ciclo Básico ${curso}° - División ${division}°`;
  } else if (ciclo === 'CS') {
    return `Ciclo Superior ${curso}° ${orientacion} - División ${division}°`;
  }
  
  return alumno.cursoDivision || 'Sin curso';
}

// Función para ordenar grupos
function ordenarGrupos(grupos) {
  const orden = {
    'CB': 1,
    'CS': 2
  };
  
  return Object.keys(grupos).sort((a, b) => {
    const [cicloA, cursoA] = a.split('-');
    const [cicloB, cursoB] = b.split('-');
    
    if (orden[cicloA] !== orden[cicloB]) {
      return orden[cicloA] - orden[cicloB];
    }
    
    if (cursoA !== cursoB) {
      return parseInt(cursoA) - parseInt(cursoB);
    }
    
    // Si es CS, ordenar por orientación
    if (cicloA === 'CS') {
      const orientA = a.split('-')[2];
      const orientB = b.split('-')[2];
      if (orientA !== orientB) {
        return orientA.localeCompare(orientB);
      }
    }
    
    // Ordenar por división
    const divA = a.split('-').pop();
    const divB = b.split('-').pop();
    return parseInt(divA) - parseInt(divB);
  });
}

async function cargarInscripcionesComedor() {
  try {
    const fechaActual = getFechaActual();
    const { collection, getDocs, query, where, doc, getDoc } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    const q = query(inscripcionesRef, where('fecha', '==', fechaActual));
    const snapshot = await getDocs(q);
    
    const inscripcionesHoy = [];
    for (const docSnap of snapshot.docs) {
      const inscripcion = { id: docSnap.id, ...docSnap.data() };
      
      // Obtener datos completos del usuario si no están en la inscripción
      if (!inscripcion.ciclo && inscripcion.usuario) {
        const usuarioRef = doc(window.db, 'usuarios', inscripcion.usuario);
        const usuarioSnap = await getDoc(usuarioRef);
        if (usuarioSnap.exists()) {
          const usuarioData = usuarioSnap.data();
          inscripcion.ciclo = usuarioData.ciclo || '';
          inscripcion.curso = usuarioData.curso || '';
          inscripcion.orientacion = usuarioData.orientacion || '';
          inscripcion.division = usuarioData.division || '';
        }
      }
      
      inscripcionesHoy.push(inscripcion);
    }
    
    const listaInscripciones = document.getElementById('listaInscripcionesComedor');
    
    if (inscripcionesHoy.length === 0) {
      listaInscripciones.innerHTML = '<p>No hay inscripciones para hoy</p>';
      return;
    }
    
    // Agrupar por curso/división
    const grupos = {};
    inscripcionesHoy.forEach(inscripcion => {
      const clave = obtenerClaveGrupo(inscripcion);
      if (!grupos[clave]) {
        grupos[clave] = [];
      }
      grupos[clave].push(inscripcion);
    });
    
    // Ordenar grupos
    const gruposOrdenados = ordenarGrupos(grupos);
    
    let html = '';
    let grupoIndex = 0;
    gruposOrdenados.forEach(claveGrupo => {
      const inscripcionesGrupo = grupos[claveGrupo];
      const nombreGrupo = obtenerNombreGrupo(inscripcionesGrupo[0]);
      const nombreGrupoCompleto = obtenerNombreGrupoCompleto(inscripcionesGrupo[0]);
      const grupoId = `grupo-inscripcion-${grupoIndex}`;
      
      html += `
        <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <button 
            class="btn-secondary" 
            style="width: 100%; text-align: left; padding: 12px 15px; background: #f0f0f0; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
            onclick="toggleGrupo('${grupoId}')"
            type="button"
          >
            <span style="font-weight: bold; color: var(--primary);">
              📚 ${nombreGrupo} 
              <span style="color: #666; font-weight: normal;">(${inscripcionesGrupo.length} ${inscripcionesGrupo.length === 1 ? 'inscripción' : 'inscripciones'})</span>
            </span>
            <span id="${grupoId}-icon" style="font-size: 18px;">▼</span>
          </button>
          <div id="${grupoId}" class="comedor-list" style="display: none; padding: 10px; background: white;">
      `;
      
      inscripcionesGrupo.forEach(inscripcion => {
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
      
      html += `
          </div>
        </div>
      `;
      grupoIndex++;
    });
    
    listaInscripciones.innerHTML = html;
  } catch (error) {
    console.error('Error al cargar inscripciones:', error);
  }
}

// FUNCIÓN REESCRITA COMPLETAMENTE PARA GARANTIZAR FALTAS INDIVIDUALES Y ÚNICAS
async function marcarAsistenciaComedor(inscripcionId, usuario, presente) {
  try {
    const { doc, updateDoc, getDoc } = window.firestore;
    
    // PASO 1: Obtener la inscripción específica por su ID
    const inscripcionRef = doc(window.db, 'inscripciones', inscripcionId);
    const inscripcionSnap = await getDoc(inscripcionRef);
    
    if (!inscripcionSnap.exists()) {
      mostrarNotificacion('Error: Inscripción no encontrada', 'error');
      return;
    }
    
    const datosInscripcion = inscripcionSnap.data();
    
    // PASO 2: Validar que el usuario de la inscripción coincida con el parámetro
    // Esto es CRÍTICO para evitar que se marquen faltas a usuarios incorrectos
    if (datosInscripcion.usuario !== usuario) {
      console.error('ERROR CRÍTICO: Usuario de inscripción no coincide');
      console.error('Usuario esperado:', usuario);
      console.error('Usuario en inscripción:', datosInscripcion.usuario);
      mostrarNotificacion('Error: Usuario no coincide. No se aplicará ninguna falta.', 'error');
      return;
    }
    
    // PASO 2.5: Verificar si la inscripción ya fue marcada
    // Si ya estaba marcada como falta (presente === false) y se vuelve a marcar como falta, no hacer nada
    // Si ya estaba marcada como presente (presente === true) y se marca como falta, decrementar strike
    const estabaMarcadaComoFalta = datosInscripcion.presente === false;
    const estabaMarcadaComoPresente = datosInscripcion.presente === true;
    
    // PASO 3: Actualizar SOLO esta inscripción específica
    await updateDoc(inscripcionRef, { 
      presente: presente,
      fechaMarcado: new Date().toISOString()
    });
    
    // PASO 4: Gestionar strikes SOLO para este usuario específico
    const usuarioRef = doc(window.db, 'usuarios', datosInscripcion.usuario);
    const usuarioSnap = await getDoc(usuarioRef);
    
    if (!usuarioSnap.exists()) {
      console.error('Usuario no encontrado en base de datos:', datosInscripcion.usuario);
      mostrarNotificacion('Error: Usuario no encontrado', 'error');
      return;
    }
    
    const datosUsuario = usuarioSnap.data();
    let strikesActuales = datosUsuario.strikes || 0;
    
    if (!presente) {
      // Si se marca como falta
      if (!estabaMarcadaComoFalta) {
        // Solo incrementar si NO estaba ya marcada como falta (para evitar duplicados)
        // Verificar que no supere el máximo de 3 faltas
        if (strikesActuales >= 3) {
          mostrarNotificacion(`${datosUsuario.nombre} ya tiene 3 faltas. No se puede agregar más.`, 'warning');
          return;
        }
        strikesActuales = strikesActuales + 1;
        
        // Actualizar strikes SOLO en este documento específico
        await updateDoc(usuarioRef, { 
          strikes: strikesActuales 
        });
        
        console.log(`Falta única aplicada a ${datosUsuario.nombre} (${datosInscripcion.usuario}). Total: ${strikesActuales}`);
        
        // Si llega a 3 strikes, bloquear pero NO enviar notificación automática
        // La notificación ahora será manual desde el panel de admin
        if (strikesActuales >= 3) {
          await updateDoc(usuarioRef, { 
            bloqueado: true
          });
          mostrarNotificacion(`${datosUsuario.nombre} ha alcanzado 3 faltas y ha sido bloqueado. Recuerde enviar la notificación manual a los tutores.`, 'warning');
        }
        
        // Si es el usuario actual, actualizar su interfaz
        if (usuarioActual && usuarioActual.usuario === datosInscripcion.usuario) {
          usuarioActual.strikes = strikesActuales;
          verificarStrikes();
        }
      } else {
        // Ya estaba marcada como falta, no hacer nada (evitar duplicados)
        mostrarNotificacion(`La falta de ${datosUsuario.nombre} ya estaba registrada anteriormente`, 'warning');
      }
    } else {
      // Si se marca como presente
      if (estabaMarcadaComoFalta) {
        // Si antes estaba marcada como falta y ahora como presente, decrementar strike (solo si tiene más de 0)
        if (strikesActuales > 0) {
          strikesActuales = strikesActuales - 1;
          await updateDoc(usuarioRef, { 
            strikes: strikesActuales,
            bloqueado: false, // Desbloquear si tenía 3 faltas
            notificadoStrikes: false // Resetear notificación
          });
          
          console.log(`Falta removida de ${datosUsuario.nombre} (${datosInscripcion.usuario}). Total: ${strikesActuales}`);
        }
      }
      
      // Si es el usuario actual, actualizar su interfaz
      if (usuarioActual && usuarioActual.usuario === datosInscripcion.usuario) {
        usuarioActual.strikes = strikesActuales;
        verificarStrikes();
        setTimeout(() => {
          verificarInscripcionComedor();
        }, 500);
      }
    }
    
    // PASO 5: Recargar listas y estadísticas
    cargarInscripcionesComedor();
    cargarEstadisticasDia();
    cargarListaAlumnos();
    
    // Si el usuario actual es el que fue marcado, actualizar su vista
    if (usuarioActual && usuarioActual.usuario === datosInscripcion.usuario && presente) {
      setTimeout(() => {
        verificarInscripcionComedor();
      }, 1000);
    }
    
    mostrarNotificacion(
      presente ? `Asistencia marcada para ${datosInscripcion.nombre}` : 
                 `Falta única registrada para ${datosInscripcion.nombre} (${strikesActuales}/3)`,
      presente ? 'success' : 'warning'
    );
    
  } catch (error) {
    console.error('Error al marcar asistencia:', error);
    console.error('Detalles del error:', error.message);
    mostrarNotificacion('Error al marcar asistencia: ' + error.message, 'error');
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
    
    // Si hay búsqueda, filtrar por texto
    if (busqueda) {
      alumnosFiltrados = alumnos.filter(alumno => 
        alumno.nombre.toLowerCase().includes(busqueda) || 
        alumno.usuario.toLowerCase().includes(busqueda) ||
        (alumno.cursoDivision && alumno.cursoDivision.toLowerCase().includes(busqueda))
      );
    } else {
      // Si no hay búsqueda, usar todos los alumnos
      alumnosFiltrados = alumnos;
    }
    
    // Aplicar todos los filtros restantes (strikes y orientación)
    aplicarTodosLosFiltros();
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
    
    aplicarTodosLosFiltros();
  } catch (error) {
    console.error('Error al filtrar por strikes:', error);
  }
}

// Función para filtrar por orientación
async function filtrarPorOrientacion(orientacion) {
  filtroOrientacion = orientacion;
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    alumnosFiltrados = [];
    snapshot.forEach(doc => {
      alumnosFiltrados.push({ id: doc.id, ...doc.data() });
    });
    
    aplicarTodosLosFiltros();
  } catch (error) {
    console.error('Error al filtrar por orientación:', error);
  }
}

// Aplicar todos los filtros (strikes + orientación + búsqueda)
function aplicarTodosLosFiltros() {
  let alumnosParaMostrar = alumnosFiltrados;
  
  // Aplicar filtro de strikes
  if (filtroActual === 'con-strikes') {
    alumnosParaMostrar = alumnosParaMostrar.filter(alumno => (alumno.strikes || 0) > 0);
  } else if (filtroActual === 'sin-strikes') {
    alumnosParaMostrar = alumnosParaMostrar.filter(alumno => (alumno.strikes || 0) === 0);
  }
  
  // Aplicar filtro de orientación
  if (filtroOrientacion !== 'todas') {
    alumnosParaMostrar = alumnosParaMostrar.filter(alumno => {
      // Verificar si el alumno pertenece a la orientación seleccionada
      if (filtroOrientacion === 'INF') {
        return (alumno.orientacion === 'INF' || 
                (alumno.cursoDivision && alumno.cursoDivision.includes('INF')));
      } else if (filtroOrientacion === 'MEC') {
        return (alumno.orientacion === 'MEC' || 
                (alumno.cursoDivision && alumno.cursoDivision.includes('MEC')));
      }
      return true;
    });
  }
  
  mostrarAlumnosFiltrados(alumnosParaMostrar);
}

// Mantener función antigua para compatibilidad
function aplicarFiltroStrikes() {
  aplicarTodosLosFiltros();
}

// Mostrar alumnos filtrados agrupados por curso/división
function mostrarAlumnosFiltrados(alumnos) {
  const listaAlumnosDiv = document.getElementById('listaAlumnos');
  
  if (alumnos.length === 0) {
    listaAlumnosDiv.innerHTML = '<p>No se encontraron alumnos que coincidan con los filtros</p>';
    return;
  }
  
  // Agrupar por curso/división
  const grupos = {};
  alumnos.forEach(alumno => {
    const clave = obtenerClaveGrupo(alumno);
    if (!grupos[clave]) {
      grupos[clave] = [];
    }
    grupos[clave].push(alumno);
  });
  
  // Ordenar grupos
  const gruposOrdenados = ordenarGrupos(grupos);
  
  let html = '';
  let grupoIndex = 0;
  gruposOrdenados.forEach(claveGrupo => {
    const alumnosGrupo = grupos[claveGrupo];
    const nombreGrupo = obtenerNombreGrupo(alumnosGrupo[0]);
    const nombreGrupoCompleto = obtenerNombreGrupoCompleto(alumnosGrupo[0]);
    const grupoId = `grupo-alumno-${grupoIndex}`;
    
    html += `
      <div style="margin-bottom: 15px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <button 
          class="btn-secondary" 
          style="width: 100%; text-align: left; padding: 12px 15px; background: #f0f0f0; border: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
          onclick="toggleGrupo('${grupoId}')"
          type="button"
        >
          <span style="font-weight: bold; color: var(--primary);">
            📚 ${nombreGrupo} 
            <span style="color: #666; font-weight: normal;">(${alumnosGrupo.length} ${alumnosGrupo.length === 1 ? 'alumno' : 'alumnos'})</span>
          </span>
          <span id="${grupoId}-icon" style="font-size: 18px;">▼</span>
        </button>
        <div id="${grupoId}" class="comedor-list" style="display: none; padding: 10px; background: white;">
    `;
    
    alumnosGrupo.forEach(alumno => {
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
    
    html += `
        </div>
      </div>
    `;
    grupoIndex++;
  });
  
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

// Función para enviar notificación a tutores (ahora solo guarda en historial, no envía email automático)
async function enviarNotificacionTutores(alumno, mensajePersonalizado, asunto) {
  try {
    const { collection, addDoc } = window.firestore;
    const notificacionesRef = collection(window.db, 'notificaciones');
    
    const nuevaNotificacion = {
      fecha: new Date().toISOString(),
      alumno: alumno.nombre,
      usuario: alumno.usuario,
      emailTutores: alumno.emailTutores,
      strikes: alumno.strikes,
      mensaje: mensajePersonalizado || `Estimados padres/tutores de ${alumno.nombre}: Les informamos que su hijo/a ha acumulado ${alumno.strikes} faltas en el comedor escolar. Por favor, comuníquese con la institución para más información.`,
      asunto: asunto || 'Notificación de faltas en el comedor escolar'
    };
    
    await addDoc(notificacionesRef, nuevaNotificacion);
    
    console.log('📧 Notificación guardada en historial para:', alumno.emailTutores);
  } catch (error) {
    console.error('Error al guardar notificación:', error);
  }
}

// ============ FUNCIONES PARA NOTIFICACIONES MANUALES ============

// Cargar alumnos en el select de notificaciones
async function cargarAlumnosParaNotificaciones() {
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    const selectAlumnos = document.getElementById('alumnoSeleccionadoNotificacion');
    selectAlumnos.innerHTML = '<option value="">Seleccionar alumno...</option>';
    
    snapshot.forEach((doc) => {
      const alumno = doc.data();
      const option = document.createElement('option');
      option.value = alumno.usuario;
      option.textContent = `${alumno.nombre} - ${alumno.cursoDivision || 'Sin curso'}`;
      selectAlumnos.appendChild(option);
    });
  } catch (error) {
    console.error('Error al cargar alumnos para notificaciones:', error);
  }
}

// Cargar datos del alumno seleccionado
async function cargarDatosAlumnoParaNotificacion() {
  const usuarioSeleccionado = document.getElementById('alumnoSeleccionadoNotificacion').value;
  
  if (!usuarioSeleccionado) {
    document.getElementById('infoAlumnoNotificacion').classList.add('oculto');
    return;
  }
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', usuarioSeleccionado));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      mostrarNotificacion('Alumno no encontrado', 'error');
      return;
    }
    
    let alumno = null;
    snapshot.forEach((doc) => {
      alumno = doc.data();
    });
    
    // Obtener faltas con fechas y horas
    const faltasConFechas = await obtenerFaltasAlumno(usuarioSeleccionado);
    
    // Mostrar información del alumno
    const detallesDiv = document.getElementById('detallesAlumnoNotificacion');
    let html = `
      <p><strong>Nombre:</strong> ${alumno.nombre}</p>
      <p><strong>Curso:</strong> ${alumno.cursoDivision || 'No especificado'}</p>
      <p><strong>Email de Tutores:</strong> ${alumno.emailTutores || 'No especificado'}</p>
      <p><strong>Faltas Acumuladas:</strong> <span style="color: var(--danger); font-weight: bold;">${alumno.strikes || 0}</span></p>
    `;
    
    if (faltasConFechas.length > 0) {
      html += `<div style="margin-top: 15px;"><strong>Detalle de Faltas:</strong><ul style="margin: 10px 0; padding-left: 20px;">`;
      faltasConFechas.forEach(falta => {
        const fecha = new Date(falta.fechaMarcado || falta.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        html += `<li>${fechaFormateada}</li>`;
      });
      html += `</ul></div>`;
    }
    
    detallesDiv.innerHTML = html;
    document.getElementById('infoAlumnoNotificacion').classList.remove('oculto');
    
    // Auto-completar mensaje y asunto
    const asuntoInput = document.getElementById('asuntoNotificacion');
    const mensajeInput = document.getElementById('mensajeNotificacion');
    
    if (!asuntoInput.value) {
      asuntoInput.value = `Notificación de faltas en el comedor escolar - ${alumno.nombre}`;
    }
    
    if (!mensajeInput.value) {
      let mensaje = `Estimados padres/tutores de ${alumno.nombre}:\n\n`;
      mensaje += `Les informamos que su hijo/a ha acumulado ${alumno.strikes || 0} falta(s) en el comedor escolar del CET N°1 General Roca.\n\n`;
      
      if (faltasConFechas.length > 0) {
        mensaje += `Detalle de faltas:\n`;
        faltasConFechas.forEach((falta, index) => {
          const fecha = new Date(falta.fechaMarcado || falta.fecha);
          const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          mensaje += `${index + 1}. ${fechaFormateada}\n`;
        });
        mensaje += `\n`;
      }
      
      mensaje += `Por favor, les solicitamos que se comuniquen con la institución para más información.\n\n`;
      mensaje += `Saludos cordiales,\nAdministración del Comedor CET N°1 General Roca`;
      
      mensajeInput.value = mensaje;
    }
  } catch (error) {
    console.error('Error al cargar datos del alumno:', error);
    mostrarNotificacion('Error al cargar datos del alumno', 'error');
  }
}

// Obtener faltas de un alumno con fechas y horas
async function obtenerFaltasAlumno(usuario) {
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const inscripcionesRef = collection(window.db, 'inscripciones');
    const q = query(inscripcionesRef, 
      where('usuario', '==', usuario), 
      where('presente', '==', false)
    );
    const snapshot = await getDocs(q);
    
    const faltas = [];
    snapshot.forEach((doc) => {
      const inscripcion = doc.data();
      faltas.push({
        fecha: inscripcion.fecha,
        fechaMarcado: inscripcion.fechaMarcado,
        hora: inscripcion.hora
      });
    });
    
    // Ordenar por fecha más reciente primero
    faltas.sort((a, b) => {
      const fechaA = new Date(a.fechaMarcado || a.fecha);
      const fechaB = new Date(b.fechaMarcado || b.fecha);
      return fechaB - fechaA;
    });
    
    return faltas;
  } catch (error) {
    console.error('Error al obtener faltas del alumno:', error);
    return [];
  }
}

// Generar link de Gmail
async function generarLinkGmail() {
  const usuarioSeleccionado = document.getElementById('alumnoSeleccionadoNotificacion').value;
  const asunto = document.getElementById('asuntoNotificacion').value.trim();
  const mensaje = document.getElementById('mensajeNotificacion').value.trim();
  
  if (!usuarioSeleccionado) {
    mostrarNotificacion('Por favor seleccione un alumno', 'warning');
    return;
  }
  
  if (!asunto || !mensaje) {
    mostrarNotificacion('Por favor complete el asunto y el mensaje', 'warning');
    return;
  }
  
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', usuarioSeleccionado));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      mostrarNotificacion('Alumno no encontrado', 'error');
      return;
    }
    
    let alumno = null;
    snapshot.forEach((doc) => {
      alumno = doc.data();
    });
    
    const emailTutores = alumno.emailTutores;
    
    if (!emailTutores) {
      mostrarNotificacion('El alumno no tiene email de tutores registrado', 'error');
      return;
    }
    
    // Codificar para URL
    const asuntoCodificado = encodeURIComponent(asunto);
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Crear link de Gmail
    const linkGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailTutores)}&su=${asuntoCodificado}&body=${mensajeCodificado}`;
    
    // Mostrar el link
    const linkDiv = document.getElementById('linkGmailGenerado');
    const linkElement = document.getElementById('linkGmail');
    linkElement.href = linkGmail;
    
    linkDiv.classList.remove('oculto');
    
    // Guardar en historial de notificaciones
    await enviarNotificacionTutores(alumno, mensaje, asunto);
    
    // Recargar historial
    cargarNotificaciones();
    
    mostrarNotificacion('Link de Gmail generado correctamente. Haga clic en el botón para abrir Gmail', 'success');
  } catch (error) {
    console.error('Error al generar link de Gmail:', error);
    mostrarNotificacion('Error al generar link de Gmail', 'error');
  }
}

// Limpiar formulario de notificación
function limpiarFormularioNotificacion() {
  document.getElementById('alumnoSeleccionadoNotificacion').value = '';
  document.getElementById('asuntoNotificacion').value = '';
  document.getElementById('mensajeNotificacion').value = '';
  document.getElementById('infoAlumnoNotificacion').classList.add('oculto');
  document.getElementById('linkGmailGenerado').classList.add('oculto');
  mostrarNotificacion('Formulario limpiado', 'success');
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
              <strong>Asunto:</strong> ${notif.asunto || 'Notificación de faltas en el comedor escolar'}
            </div>
            <div style="font-size: 14px; color: #666; margin-bottom: 5px;">
              <strong>Fecha:</strong> ${fechaFormateada}
            </div>
            <div style="background-color: #f8f9fa; padding: 10px; border-radius: 6px; margin-top: 8px; font-size: 14px; white-space: pre-wrap;">
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

// ============ FUNCIONES PARA IMPORTAR/EXPORTAR EXCEL ============

// Función para mostrar/ocultar formulario de importación Excel
function toggleImportarExcel() {
  const formulario = document.getElementById('formularioImportarExcel');
  const btnTexto = document.getElementById('btnTextoExcel');
  
  if (formulario.classList.contains('oculto')) {
    formulario.classList.remove('oculto');
    btnTexto.textContent = '✕ Cerrar Importación';
  } else {
    formulario.classList.add('oculto');
    btnTexto.textContent = '📊 Importar desde Excel';
    datosExcelImportados = null;
    document.getElementById('archivoExcel').value = '';
    document.getElementById('vistaPreviaExcel').classList.add('oculto');
  }
}

// Función para procesar archivo Excel
function procesarArchivoExcel(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Leer la primera hoja
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      if (jsonData.length === 0) {
        mostrarNotificacion('El archivo Excel está vacío', 'error');
        return;
      }
      
      // Guardar datos para importación
      datosExcelImportados = jsonData;
      
      // Mostrar vista previa
      mostrarVistaPreviaExcel(jsonData);
      
    } catch (error) {
      console.error('Error al procesar Excel:', error);
      mostrarNotificacion('Error al procesar el archivo Excel', 'error');
    }
  };
  
  reader.readAsArrayBuffer(file);
}

// Función para mostrar vista previa del Excel
function mostrarVistaPreviaExcel(datos) {
  const vistaPreviaDiv = document.getElementById('vistaPreviaExcel');
  const tablaDiv = document.getElementById('tablaPreviewExcel');
  
  if (datos.length === 0) {
    tablaDiv.innerHTML = '<p>No hay datos para mostrar</p>';
    return;
  }
  
  // Obtener columnas
  const columnas = Object.keys(datos[0]);
  
  let html = '<table style="width: 100%; border-collapse: collapse; font-size: 14px;">';
  html += '<thead><tr style="background: #f0f0f0;">';
  columnas.forEach(col => {
    html += `<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">${col}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  // Mostrar máximo 10 filas en vista previa
  datos.slice(0, 10).forEach(fila => {
    html += '<tr>';
    columnas.forEach(col => {
      html += `<td style="padding: 6px; border: 1px solid #ddd;">${fila[col] || ''}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  
  if (datos.length > 10) {
    html += `<p style="margin-top: 10px; color: #666;">... y ${datos.length - 10} filas más</p>`;
  }
  
  tablaDiv.innerHTML = html;
  vistaPreviaDiv.classList.remove('oculto');
}

// Función para importar alumnos desde Excel
async function importarAlumnosDesdeExcel() {
  if (!datosExcelImportados || datosExcelImportados.length === 0) {
    mostrarNotificacion('No hay datos para importar', 'error');
    return;
  }
  
  try {
    const { collection, getDocs, query, where, setDoc, doc } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    
    let importados = 0;
    let actualizados = 0;
    let errores = 0;
    
    for (const fila of datosExcelImportados) {
      try {
        // Intentar detectar las columnas del Excel (flexible)
        const nombre = fila['Nombre'] || fila['nombre'] || fila['NOMBRE'] || fila['Nombre Completo'] || '';
        const dni = fila['DNI'] || fila['dni'] || fila['Cédula'] || fila['cedula'] || '';
        const email = fila['Email'] || fila['email'] || fila['EMAIL'] || fila['Email Tutores'] || fila['Email de Tutores'] || '';
        const ciclo = fila['Ciclo'] || fila['ciclo'] || fila['CICLO'] || '';
        const curso = fila['Curso'] || fila['curso'] || fila['CURSO'] || '';
        const orientacion = fila['Orientación'] || fila['Orientacion'] || fila['orientación'] || fila['orientacion'] || fila['ORIENTACIÓN'] || fila['ORIENTACION'] || '';
        const division = fila['División'] || fila['Division'] || fila['división'] || fila['division'] || fila['DIVISIÓN'] || fila['DIVISION'] || fila['Div'] || '';
        
        if (!nombre) {
          errores++;
          continue;
        }
        
        // Generar usuario y contraseña por defecto
        // Prioridad: usar DNI si existe, sino usar nombre (sin espacios, minúsculas)
        const usuarioDefault = dni ? dni.toString() : nombre.toLowerCase().replace(/\s+/g, '');
        const contraseñaDefault = dni ? dni.toString() : nombre.toLowerCase().replace(/\s+/g, '');
        
        // Verificar si el usuario ya existe
        const q = query(usuariosRef, where('usuario', '==', usuarioDefault));
        const snapshot = await getDocs(q);
        
        // Construir cursoDivision completo
        let cursoDivision = '';
        if (ciclo && curso && division) {
          if (ciclo === 'CB' || ciclo === 'CB ') {
            cursoDivision = `CB ${curso}° ${division}°`;
          } else if (ciclo === 'CS' || ciclo === 'CS ') {
            if (orientacion) {
              cursoDivision = `CS ${curso}° ${orientacion} ${division}°`;
            } else {
              cursoDivision = `CS ${curso}° ${division}°`;
            }
          } else {
            cursoDivision = curso && division ? `${curso} ${division}` : (curso || division || '');
          }
        } else {
          cursoDivision = curso && division ? `${curso} ${division}` : (curso || division || '');
        }
        
        if (snapshot.empty) {
          // Crear nuevo usuario
          const nuevoAlumno = {
            usuario: usuarioDefault,
            contraseña: contraseñaDefault,
            tipo: 'alumno',
            nombre: nombre,
            cursoDivision: cursoDivision,
            ciclo: ciclo || '',
            curso: curso || '',
            orientacion: (ciclo === 'CS' || ciclo === 'CS ') ? (orientacion || '') : '',
            division: division || '',
            emailTutores: email || '',
            strikes: 0,
            notificadoStrikes: false,
            bloqueado: false,
            credencialesModificadas: false,
            dni: dni || ''
          };
          
          await setDoc(doc(window.db, 'usuarios', usuarioDefault), nuevoAlumno);
          importados++;
        } else {
          // Actualizar usuario existente
          const usuarioRef = doc(window.db, 'usuarios', usuarioDefault);
          await setDoc(usuarioRef, {
            nombre: nombre,
            cursoDivision: cursoDivision,
            ciclo: ciclo || '',
            curso: curso || '',
            orientacion: (ciclo === 'CS' || ciclo === 'CS ') ? (orientacion || '') : '',
            division: division || '',
            emailTutores: email || '',
            dni: dni || ''
          }, { merge: true });
          actualizados++;
        }
      } catch (error) {
        console.error('Error al importar fila:', error);
        errores++;
      }
    }
    
    mostrarNotificacion(
      `Importación completada: ${importados} nuevos, ${actualizados} actualizados, ${errores} errores`,
      importados + actualizados > 0 ? 'success' : 'error'
    );
    
    // Limpiar y recargar
    cancelarImportacionExcel();
    cargarListaAlumnos();
    
  } catch (error) {
    console.error('Error al importar alumnos:', error);
    mostrarNotificacion('Error al importar alumnos', 'error');
  }
}

// Función para cancelar importación
function cancelarImportacionExcel() {
  datosExcelImportados = null;
  document.getElementById('archivoExcel').value = '';
  document.getElementById('vistaPreviaExcel').classList.add('oculto');
  toggleImportarExcel();
}

// Función para exportar alumnos a Excel
async function exportarAlumnosAExcel() {
  try {
    const { collection, getDocs, query, where } = window.firestore;
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    const alumnos = [];
    snapshot.forEach(doc => {
      alumnos.push(doc.data());
    });
    
    if (alumnos.length === 0) {
      mostrarNotificacion('No hay alumnos para exportar', 'warning');
      return;
    }
    
    // Preparar datos para Excel
    const datosExport = alumnos.map(alumno => ({
      'Nombre': alumno.nombre || '',
      'Usuario': alumno.usuario || '',
      'DNI': alumno.dni || '',
      'Email Tutores': alumno.emailTutores || '',
      'Curso y División': alumno.cursoDivision || '',
      'Faltas': alumno.strikes || 0,
      'Bloqueado': alumno.bloqueado ? 'Sí' : 'No',
      'Credenciales Modificadas': alumno.credencialesModificadas ? 'Sí' : 'No'
    }));
    
    // Crear workbook
    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    
    // Descargar archivo
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `alumnos_${fecha}.xlsx`);
    
    mostrarNotificacion('Archivo Excel exportado correctamente', 'success');
    
  } catch (error) {
    console.error('Error al exportar:', error);
    mostrarNotificacion('Error al exportar a Excel', 'error');
  }
}

// ============ FUNCIONES PARA MODIFICAR CUENTA (UNA SOLA VEZ) ============

// Función para verificar estado de modificación de cuenta
function verificarEstadoModificacionCuenta() {
  if (!usuarioActual || usuarioActual.tipo !== 'alumno') return;
  
  const btnModificar = document.getElementById('btnModificarCuenta');
  if (usuarioActual.credencialesModificadas) {
    btnModificar.disabled = true;
    btnModificar.textContent = '🔒 Credenciales ya modificadas';
    btnModificar.classList.add('btn-disabled');
  } else {
    btnModificar.disabled = false;
    btnModificar.textContent = '🔧 Modificar Mi Cuenta';
    btnModificar.classList.remove('btn-disabled');
  }
}

// Función para mostrar/ocultar formulario de modificación
function toggleModificarCuenta() {
  if (usuarioActual && usuarioActual.credencialesModificadas) {
    mostrarNotificacion('Ya modificaste tus credenciales. Solo puedes hacerlo una vez.', 'warning');
    return;
  }
  
  const formulario = document.getElementById('formularioModificarCuenta');
  if (formulario.classList.contains('oculto')) {
    formulario.classList.remove('oculto');
    // Limpiar campos
    document.getElementById('nuevoUsuario').value = '';
    document.getElementById('nuevaContraseña').value = '';
    document.getElementById('confirmarContraseña').value = '';
  } else {
    formulario.classList.add('oculto');
  }
}

// Función para cancelar modificación
function cancelarModificacionCuenta() {
  document.getElementById('formularioModificarCuenta').classList.add('oculto');
  document.getElementById('nuevoUsuario').value = '';
  document.getElementById('nuevaContraseña').value = '';
  document.getElementById('confirmarContraseña').value = '';
}

// Función para guardar modificación de cuenta
async function guardarModificacionCuenta() {
  if (!usuarioActual || usuarioActual.tipo !== 'alumno') return;
  
  if (usuarioActual.credencialesModificadas) {
    mostrarNotificacion('Ya modificaste tus credenciales. Solo puedes hacerlo una vez.', 'error');
    return;
  }
  
  const nuevoUsuario = document.getElementById('nuevoUsuario').value.trim();
  const nuevaContraseña = document.getElementById('nuevaContraseña').value;
  const confirmarContraseña = document.getElementById('confirmarContraseña').value;
  
  if (!nuevoUsuario || !nuevaContraseña || !confirmarContraseña) {
    mostrarNotificacion('Por favor complete todos los campos', 'warning');
    return;
  }
  
  if (nuevaContraseña !== confirmarContraseña) {
    mostrarNotificacion('Las contraseñas no coinciden', 'error');
    return;
  }
  
  if (nuevaContraseña.length < 4) {
    mostrarNotificacion('La contraseña debe tener al menos 4 caracteres', 'error');
    return;
  }
  
  try {
    const { collection, getDocs, query, where, doc, updateDoc } = window.firestore;
    
    // Verificar que el nuevo usuario no exista
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('usuario', '==', nuevoUsuario));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty && nuevoUsuario !== usuarioActual.usuario) {
      mostrarNotificacion('El usuario ya existe. Por favor elige otro.', 'error');
      return;
    }
    
    // Actualizar usuario
    const usuarioRef = doc(window.db, 'usuarios', usuarioActual.usuario);
    
    // Si cambió el usuario, necesitamos crear un nuevo documento y eliminar el anterior
    if (nuevoUsuario !== usuarioActual.usuario) {
      const { setDoc, deleteDoc } = window.firestore;
      
      // Crear nuevo documento con el nuevo usuario
      const nuevoUsuarioRef = doc(window.db, 'usuarios', nuevoUsuario);
      await setDoc(nuevoUsuarioRef, {
        ...usuarioActual,
        usuario: nuevoUsuario,
        contraseña: nuevaContraseña,
        credencialesModificadas: true
      });
      
      // Eliminar el documento anterior
      await deleteDoc(usuarioRef);
      
      // Actualizar usuario actual
      usuarioActual.usuario = nuevoUsuario;
      usuarioActual.contraseña = nuevaContraseña;
      usuarioActual.credencialesModificadas = true;
    } else {
      // Solo actualizar contraseña
      await updateDoc(usuarioRef, {
        contraseña: nuevaContraseña,
        credencialesModificadas: true
      });
      
      usuarioActual.contraseña = nuevaContraseña;
      usuarioActual.credencialesModificadas = true;
    }
    
    mostrarNotificacion('Credenciales actualizadas correctamente. Por favor, inicia sesión nuevamente.', 'success');
    
    // Cerrar formulario
    cancelarModificacionCuenta();
    verificarEstadoModificacionCuenta();
    
    // Cerrar sesión después de 2 segundos para que el usuario inicie sesión con las nuevas credenciales
    setTimeout(() => {
      logout();
      mostrarNotificacion('Por favor, inicia sesión con tus nuevas credenciales', 'info');
    }, 2000);
    
  } catch (error) {
    console.error('Error al modificar cuenta:', error);
    mostrarNotificacion('Error al modificar cuenta', 'error');
  }
}

// ============ FUNCIÓN DE DEPURACIÓN (ELIMINAR TODOS LOS ALUMNOS) ============

// Función para eliminar todos los alumnos con doble confirmación
async function depurarTodosAlumnos() {
  // PRIMERA CONFIRMACIÓN
  const primeraConfirmacion = confirm(
    '⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n' +
    'Estás a punto de eliminar TODOS los alumnos de la base de datos.\n\n' +
    'Esta acción:\n' +
    '- Eliminará todos los alumnos registrados\n' +
    '- Eliminará todas sus inscripciones\n' +
    '- NO se puede deshacer\n\n' +
    '¿Estás ABSOLUTAMENTE seguro de que quieres continuar?'
  );
  
  if (!primeraConfirmacion) {
    return;
  }
  
  // SEGUNDA CONFIRMACIÓN (doble verificación)
  const segundaConfirmacion = confirm(
    '⚠️ ÚLTIMA OPORTUNIDAD ⚠️\n\n' +
    'Esta es tu segunda y última confirmación.\n\n' +
    'Si continúas, se eliminarán TODOS los alumnos.\n\n' +
    'Escribe "ELIMINAR TODO" en el siguiente paso para confirmar.\n\n' +
    '¿Continuar con la eliminación?'
  );
  
  if (!segundaConfirmacion) {
    mostrarNotificacion('Operación cancelada', 'success');
    return;
  }
  
  // TERCERA CONFIRMACIÓN (con texto específico)
  const textoConfirmacion = prompt(
    '⚠️ CONFIRMACIÓN FINAL ⚠️\n\n' +
    'Para confirmar la eliminación de TODOS los alumnos, escribe exactamente:\n\n' +
    'ELIMINAR TODO\n\n' +
    '(En mayúsculas, sin espacios extra)'
  );
  
  if (textoConfirmacion !== 'ELIMINAR TODO') {
    mostrarNotificacion('Texto de confirmación incorrecto. Operación cancelada.', 'warning');
    return;
  }
  
  try {
    const { collection, getDocs, query, where, deleteDoc, doc } = window.firestore;
    
    // Obtener todos los alumnos
    const usuariosRef = collection(window.db, 'usuarios');
    const q = query(usuariosRef, where('tipo', '==', 'alumno'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      mostrarNotificacion('No hay alumnos para eliminar', 'warning');
      return;
    }
    
    let eliminados = 0;
    let errores = 0;
    const usuariosParaEliminar = [];
    
    // Primero, recopilar todos los usuarios a eliminar
    snapshot.forEach((docSnap) => {
      usuariosParaEliminar.push({
        id: docSnap.id,
        usuario: docSnap.data().usuario
      });
    });
    
    // Eliminar cada alumno y sus inscripciones
    for (const usuarioData of usuariosParaEliminar) {
      try {
        // Eliminar el usuario
        const usuarioRef = doc(window.db, 'usuarios', usuarioData.id);
        await deleteDoc(usuarioRef);
        
        // Eliminar todas sus inscripciones
        const inscripcionesRef = collection(window.db, 'inscripciones');
        const qInscripciones = query(inscripcionesRef, where('usuario', '==', usuarioData.usuario));
        const inscripcionesSnap = await getDocs(qInscripciones);
        
        const deletePromises = [];
        inscripcionesSnap.forEach((inscripcionDoc) => {
          deletePromises.push(deleteDoc(inscripcionDoc.ref));
        });
        await Promise.all(deletePromises);
        
        eliminados++;
      } catch (error) {
        console.error('Error al eliminar alumno:', error);
        errores++;
      }
    }
    
    mostrarNotificacion(
      `Depuración completada: ${eliminados} alumnos eliminados${errores > 0 ? `, ${errores} errores` : ''}`,
      eliminados > 0 ? 'success' : 'error'
    );
    
    // Recargar listas
    cargarListaAlumnos();
    cargarInscripcionesComedor();
    cargarEstadisticasDia();
    
  } catch (error) {
    console.error('Error al depurar alumnos:', error);
    mostrarNotificacion('Error al eliminar alumnos: ' + error.message, 'error');
  }
}

// Función para toggle (abrir/cerrar) grupos desplegables
function toggleGrupo(grupoId) {
  const grupo = document.getElementById(grupoId);
  const icon = document.getElementById(grupoId + '-icon');
  
  if (grupo.style.display === 'none') {
    grupo.style.display = 'block';
    icon.textContent = '▲';
  } else {
    grupo.style.display = 'none';
    icon.textContent = '▼';
  }
}

// ============ MEJORA EN INSCRIPCIÓN PARA HORARIOS INDIVIDUALES ============

// Actualizar función de inscripción para guardar horario individual
