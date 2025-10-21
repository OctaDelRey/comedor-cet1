// Inicialización de datos en localStorage si no existen
if (!localStorage.getItem('usuarios')) {
  const usuarios = [
    { usuario: 'admin', contraseña: 'admin123', tipo: 'admin' },
    { usuario: 'alumno1', contraseña: 'alumno123', tipo: 'alumno', nombre: 'Juan Pérez', cursoDivision: '4to 1ra', emailTutores: 'padres.juan@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false },
    { usuario: 'alumno2', contraseña: 'alumno123', tipo: 'alumno', nombre: 'María García', cursoDivision: 'CB 2do 1ra', emailTutores: 'padres.maria@ejemplo.com', strikes: 0, notificadoStrikes: false, bloqueado: false }
  ];
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
}

if (!localStorage.getItem('inscripcionesComedor')) {
  localStorage.setItem('inscripcionesComedor', JSON.stringify([]));
}

if (!localStorage.getItem('menuDelDia')) {
  localStorage.setItem('menuDelDia', JSON.stringify({}));
}

// Configuración de horarios
if (!localStorage.getItem('configuracionHorarios')) {
  const configuracion = {
    horaLimiteInscripcion: '23:00', // Hora límite para inscribirse (ej: hasta las 11 PM)
    horaLimiteCancelacion: '23:30'  // Hora límite para cancelar (ej: hasta las 11:30 PM)
  };
  localStorage.setItem('configuracionHorarios', JSON.stringify(configuracion));
}

let usuarioActual = null;

// Variables para filtros de alumnos
let alumnosFiltrados = [];
let filtroActual = 'todos';

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
function puedeInscribirse() {
  const config = JSON.parse(localStorage.getItem('configuracionHorarios'));
  return estaAntesDeHora(config.horaLimiteInscripcion);
}

// Función para verificar si puede cancelar
function puedeCancelar() {
  const config = JSON.parse(localStorage.getItem('configuracionHorarios'));
  return estaAntesDeHora(config.horaLimiteCancelacion);
}

function login() {
  const usuario = document.getElementById('usuario').value;
  const contraseña = document.getElementById('contraseña').value;
  
  // Verificar que los campos no estén vacíos
  if (!usuario || !contraseña) {
    mostrarNotificacion('Por favor complete todos los campos', 'warning');
    return;
  }
  
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  
  // Debug: mostrar usuarios disponibles en consola
  console.log('Usuarios disponibles:', usuarios);
  
  const usuarioEncontrado = usuarios.find(u => u.usuario === usuario && u.contraseña === contraseña);
  
  if (usuarioEncontrado) {
    usuarioActual = usuarioEncontrado;
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
    console.log('Usuario no encontrado. Usuario ingresado:', usuario, 'Contraseña ingresada:', contraseña);
    mostrarNotificacion('Usuario o contraseña incorrectos', 'error');
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

function registrarAlumno() {
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
  
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  
  // Validar si el usuario ya existe
  if (usuarios.find(u => u.usuario === usuario)) {
    mostrarNotificacion('El usuario ya existe', 'error');
    return;
  }
  
  // Construir cursoDivision
  const cursoDivision = `${curso} ${division}`;
  
  // Agregar el nuevo alumno
  usuarios.push({
    usuario: usuario,
    contraseña: contraseña,
    tipo: 'alumno',
    nombre: nombre,
    cursoDivision: cursoDivision,
    emailTutores: emailTutores,
    strikes: 0,
    notificadoStrikes: false,
    bloqueado: false
  });
  
  localStorage.setItem('usuarios', JSON.stringify(usuarios));
  
  mostrarNotificacion('Alumno registrado con éxito', 'success');
  
  // Cerrar formulario
  toggleFormularioRegistro();
  
  // Actualizar lista de alumnos
  cargarListaAlumnos();
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

function cargarListaAlumnos() {
  // Inicializar filtros
  alumnosFiltrados = [];
  filtroActual = 'todos';
  document.getElementById('buscarAlumno').value = '';
  
  // Cargar todos los alumnos inicialmente
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  const alumnos = usuarios.filter(u => u.tipo === 'alumno');
  alumnosFiltrados = alumnos;
  
  if (alumnos.length === 0) {
    document.getElementById('listaAlumnos').innerHTML = '<p>No hay alumnos registrados</p>';
    return;
  }
  
  // Mostrar todos los alumnos
  mostrarAlumnosFiltrados(alumnos);
}

function establecerMenuDelDia() {
  const menu = document.getElementById('menuDelDia').value;
  
  if (!menu) {
    mostrarNotificacion('Por favor ingrese el menú del día', 'warning');
    return;
  }
  
  const menuDelDia = {
    fecha: getFechaActual(),
    menu: menu
  };
  
  localStorage.setItem('menuDelDia', JSON.stringify(menuDelDia));
  
  // Actualizar la visualización
  cargarMenuDelDia();
  
  mostrarNotificacion('Menú del día establecido correctamente', 'success');
}

function cargarMenuDelDia() {
  const menuDelDia = JSON.parse(localStorage.getItem('menuDelDia'));
  const infoMenuDiv = document.getElementById('infoMenuDelDia');
  const textoMenu = document.getElementById('textoMenuDelDia');
  
  if (menuDelDia && menuDelDia.fecha === getFechaActual()) {
    infoMenuDiv.classList.remove('oculto');
    textoMenu.textContent = menuDelDia.menu;
  } else {
    infoMenuDiv.classList.add('oculto');
  }
}

function cargarMenuAlumno() {
  const diaSeleccionado = document.getElementById('diaInscripcion') ? document.getElementById('diaInscripcion').value : 'hoy';
  actualizarMenuSegunDia(diaSeleccionado);
}

function actualizarMenuSegunDia(dia) {
  const menuDelDia = JSON.parse(localStorage.getItem('menuDelDia'));
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
}

function cambiarDiaInscripcion() {
  const dia = document.getElementById('diaInscripcion').value;
  actualizarMenuSegunDia(dia);
}

function inscribirComedor() {
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
  
  console.log('Día seleccionado:', diaSeleccionado);
  console.log('Fecha de inscripción:', fechaInscripcion);
  
  // Verificar si hay menú establecido para el día seleccionado
  const menuGuardado = JSON.parse(localStorage.getItem('menuDelDia'));
  console.log('Menú guardado:', menuGuardado);
  
  const hayMenu = menuGuardado && menuGuardado.fecha === fechaInscripcion;
  console.log('¿Hay menú para el día seleccionado?', hayMenu);
  
  // Si no hay menú, preguntar al alumno
  if (!hayMenu) {
    const confirmar = confirm(
      '⚠️ AVISO IMPORTANTE\n\n' +
      `Aún no se ha establecido el menú para ${textoFecha}.\n\n` +
      '¿Estás seguro/a que querés anotarte igual?\n\n' +
      'Recordá que podés cancelar tu inscripción más tarde si cambias de opinión.'
    );
    
    if (!confirmar) {
      return; // El alumno canceló la inscripción
    }
  }
  
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  
  // Verificar si ya está inscrito para ese día
  const yaInscrito = inscripciones.find(i => 
    i.usuario === usuarioActual.usuario && i.fecha === fechaInscripcion
  );
  
  if (yaInscrito) {
    mostrarNotificacion(`Ya estás inscrito al comedor para ${textoFecha}`, 'warning');
    return;
  }
  
  // Registrar la inscripción
  inscripciones.push({
    usuario: usuarioActual.usuario,
    nombre: usuarioActual.nombre,
    cursoDivision: usuarioActual.cursoDivision,
    fecha: fechaInscripcion,
    hora: hora,
    presente: null // Se marcará luego por el admin
  });
  
  localStorage.setItem('inscripcionesComedor', JSON.stringify(inscripciones));
  
  // Actualizar la interfaz
  verificarInscripcionComedor();
  
  mostrarNotificacion(`¡Listo! Te anotaste al comedor de ${textoFecha} para las ${hora}`, 'success');
}

function verificarInscripcionComedor() {
  if (!usuarioActual) return;
  
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  
  // Buscar inscripción para hoy o mañana
  const fechaHoy = getFechaActual();
  const fechaMañana = getFechaMañana();
  
  const inscripcionHoy = inscripciones.find(i => 
    i.usuario === usuarioActual.usuario && i.fecha === fechaHoy
  );
  
  const inscripcionMañana = inscripciones.find(i => 
    i.usuario === usuarioActual.usuario && i.fecha === fechaMañana
  );
  
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
}

function cargarInscripcionesComedor() {
  const fechaActual = getFechaActual();
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  const inscripcionesHoy = inscripciones.filter(i => i.fecha === fechaActual);
  
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
            <button class="btn-success" onclick="marcarAsistenciaComedor('${inscripcion.usuario}', true)">Presente</button>
            <button class="btn-danger" onclick="marcarAsistenciaComedor('${inscripcion.usuario}', false)">Falta</button>
          ` : ''}
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  listaInscripciones.innerHTML = html;
}

function marcarAsistenciaComedor(usuario, presente) {
  const fechaActual = getFechaActual();
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  
  // Encontrar y actualizar la inscripción
  const inscripcionIndex = inscripciones.findIndex(i => 
    i.usuario === usuario && i.fecha === fechaActual
  );
  
  if (inscripcionIndex !== -1) {
    inscripciones[inscripcionIndex].presente = presente;
    localStorage.setItem('inscripcionesComedor', JSON.stringify(inscripciones));
    
    // Si el alumno falta, agregar un strike
    if (!presente) {
      const usuarioIndex = usuarios.findIndex(u => u.usuario === usuario);
      if (usuarioIndex !== -1) {
        usuarios[usuarioIndex].strikes = (usuarios[usuarioIndex].strikes || 0) + 1;
        const strikesActuales = usuarios[usuarioIndex].strikes;
        
        // Si llega a 3 strikes y no se ha notificado antes
        if (strikesActuales >= 3 && !usuarios[usuarioIndex].notificadoStrikes) {
          enviarNotificacionTutores(usuarios[usuarioIndex]);
          usuarios[usuarioIndex].notificadoStrikes = true;
          usuarios[usuarioIndex].bloqueado = true; // Bloquear al alumno
          mostrarNotificacion(`${usuarios[usuarioIndex].nombre} ha sido bloqueado del comedor`, 'warning');
        }
        
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        
        // Si es el usuario actual, actualizar la interfaz
        if (usuarioActual && usuarioActual.usuario === usuario) {
          usuarioActual.strikes = usuarios[usuarioIndex].strikes;
          verificarStrikes();
        }
      }
    } else {
      // Si el alumno está presente, no agregar strike pero actualizar la interfaz si es el usuario actual
      if (usuarioActual && usuarioActual.usuario === usuario) {
        verificarStrikes();
      }
    }
    
    // Recargar la lista y estadísticas
    cargarInscripcionesComedor();
    cargarEstadisticasDia();
    cargarListaAlumnos(); // Actualizar la lista de alumnos con los strikes actualizados
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
function cancelarInscripcionComedor() {
  if (!usuarioActual) return;
  
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  
  // Buscar inscripción activa (hoy o mañana)
  const fechaHoy = getFechaActual();
  const fechaMañana = getFechaMañana();
  
  let inscripcionIndex = inscripciones.findIndex(i => 
    i.usuario === usuarioActual.usuario && (i.fecha === fechaHoy || i.fecha === fechaMañana)
  );
  
  if (inscripcionIndex !== -1) {
    const diaTexto = inscripciones[inscripcionIndex].fecha === fechaHoy ? 'hoy' : 'mañana';
    
    // Eliminar la inscripción
    inscripciones.splice(inscripcionIndex, 1);
    localStorage.setItem('inscripcionesComedor', JSON.stringify(inscripciones));
    
    // Actualizar la interfaz
    verificarInscripcionComedor();
    
    mostrarNotificacion(`Inscripción cancelada. Ya no estás anotado/a para ${diaTexto}.`, 'success');
  }
}

// Función para filtrar alumnos por texto
function filtrarAlumnos() {
  const busqueda = document.getElementById('buscarAlumno').value.toLowerCase();
  // Siempre obtener datos frescos desde localStorage
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  const alumnos = usuarios.filter(u => u.tipo === 'alumno');
  
  // Actualizar la variable global con datos frescos
  alumnosFiltrados = alumnos.filter(alumno => 
    alumno.nombre.toLowerCase().includes(busqueda) || 
    alumno.usuario.toLowerCase().includes(busqueda) ||
    (alumno.cursoDivision && alumno.cursoDivision.toLowerCase().includes(busqueda))
  );
  
  aplicarFiltroStrikes();
}

// Función para filtrar por strikes
function filtrarPorStrikes(tipo) {
  filtroActual = tipo;
  // Recargar datos frescos antes de filtrar
  const usuarios = JSON.parse(localStorage.getItem('usuarios'));
  alumnosFiltrados = usuarios.filter(u => u.tipo === 'alumno');
  aplicarFiltroStrikes();
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
function resetearStrikes(usuario) {
  if (confirm('¿Estás seguro de que quieres resetear las faltas de este alumno?')) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios'));
    const usuarioIndex = usuarios.findIndex(u => u.usuario === usuario);
    
    if (usuarioIndex !== -1) {
      usuarios[usuarioIndex].strikes = 0;
      usuarios[usuarioIndex].notificadoStrikes = false; // Resetear también el estado de notificación
      usuarios[usuarioIndex].bloqueado = false; // Desbloquear al alumno
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      
      // Actualizar la lista
      filtrarAlumnos();
      mostrarNotificacion('Faltas del alumno reseteadas correctamente', 'success');
    }
  }
}

// Función para validar alumno (desbloquear después de respuesta de tutores)
function validarAlumno(usuario) {
  if (confirm('¿Has recibido la confirmación de los tutores para validar a este alumno?')) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios'));
    const usuarioIndex = usuarios.findIndex(u => u.usuario === usuario);
    
    if (usuarioIndex !== -1) {
      usuarios[usuarioIndex].bloqueado = false;
      usuarios[usuarioIndex].strikes = 0; // Resetear strikes al validar
      usuarios[usuarioIndex].notificadoStrikes = false;
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      
      // Actualizar la lista
      filtrarAlumnos();
      mostrarNotificacion(`${usuarios[usuarioIndex].nombre} ha sido validado y desbloqueado correctamente`, 'success');
    }
  }
}

// Función para eliminar un alumno
function eliminarAlumno(usuario) {
  if (confirm('¿Estás seguro de que quieres eliminar este alumno? Esta acción no se puede deshacer.')) {
    const usuarios = JSON.parse(localStorage.getItem('usuarios'));
    const usuarioIndex = usuarios.findIndex(u => u.usuario === usuario);
    
    if (usuarioIndex !== -1) {
      const nombreAlumno = usuarios[usuarioIndex].nombre;
      
      // Eliminar el usuario
      usuarios.splice(usuarioIndex, 1);
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      
      // También eliminar sus inscripciones al comedor
      const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
      const inscripcionesFiltradas = inscripciones.filter(i => i.usuario !== usuario);
      localStorage.setItem('inscripcionesComedor', JSON.stringify(inscripcionesFiltradas));
      
      // Actualizar la lista
      filtrarAlumnos();
      cargarInscripcionesComedor();
      cargarEstadisticasDia();
      mostrarNotificacion(`${nombreAlumno} ha sido eliminado del sistema`, 'success');
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
function enviarNotificacionTutores(alumno) {
  // En un sistema real, aquí se enviaría un email real
  // Por ahora, lo simularemos guardando la notificación en localStorage
  
  const notificaciones = JSON.parse(localStorage.getItem('notificacionesEnviadas') || '[]');
  
  const nuevaNotificacion = {
    fecha: new Date().toISOString(),
    alumno: alumno.nombre,
    usuario: alumno.usuario,
    emailTutores: alumno.emailTutores,
    strikes: alumno.strikes,
    mensaje: `Estimados padres/tutores de ${alumno.nombre}: Les informamos que su hijo/a ha acumulado ${alumno.strikes} faltas en el comedor escolar. Por favor, comuníquese con la institución para más información.`
  };
  
  notificaciones.push(nuevaNotificacion);
  localStorage.setItem('notificacionesEnviadas', JSON.stringify(notificaciones));
  
  // Mostrar notificación al administrador
  console.log('📧 Notificación enviada a:', alumno.emailTutores);
  console.log('Mensaje:', nuevaNotificacion.mensaje);
  
  // En un sistema real, aquí se haría la llamada a la API de email
  // Ejemplo: fetch('/api/enviar-email', { method: 'POST', body: JSON.stringify(nuevaNotificacion) })
  
  mostrarNotificacion(`Notificación enviada a tutores de ${alumno.nombre}`, 'success');
}

// Función para cargar estadísticas del día
function cargarEstadisticasDia() {
  const fechaActual = getFechaActual();
  const inscripciones = JSON.parse(localStorage.getItem('inscripcionesComedor'));
  const inscripcionesHoy = inscripciones.filter(i => i.fecha === fechaActual);
  
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
}

// Función para cargar notificaciones enviadas
function cargarNotificaciones() {
  const notificaciones = JSON.parse(localStorage.getItem('notificacionesEnviadas') || '[]');
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
}

// Función para cargar configuración de horarios
function cargarConfiguracionHorarios() {
  const config = JSON.parse(localStorage.getItem('configuracionHorarios'));
  document.getElementById('horaLimiteInscripcion').value = config.horaLimiteInscripcion;
  document.getElementById('horaLimiteCancelacion').value = config.horaLimiteCancelacion;
}

// Función para guardar configuración de horarios
function guardarConfiguracionHorarios() {
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
  
  const config = {
    horaLimiteInscripcion: horaInscripcion,
    horaLimiteCancelacion: horaCancelacion
  };
  
  localStorage.setItem('configuracionHorarios', JSON.stringify(config));
  mostrarNotificacion('Configuración de horarios guardada correctamente', 'success');
}
