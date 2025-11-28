# Instrucciones para Firebase y Netlify

## ✅ Firebase - NO requiere cambios de configuración

**Buenas noticias:** No necesitas hacer ningún cambio en la configuración de Firebase. El sistema funciona automáticamente con la estructura actual.

### ¿Qué cambió en la estructura de datos?

Los nuevos campos que se agregan a cada alumno son:
- `ciclo`: "CB" o "CS"
- `curso`: "1", "2", "3", "4"
- `orientacion`: "INF" o "MEC" (solo para CS)
- `division`: "1", "2", "3", "4"
- `cursoDivision`: Texto completo (ej: "CB 1° 1°" o "CS 2° INF 1°")

### ¿Qué pasa con los alumnos existentes?

Los alumnos que ya están registrados **seguirán funcionando** porque:
1. El sistema usa `cursoDivision` como fallback si no tienen los campos individuales
2. Al importar desde Excel o registrar nuevos alumnos, se agregarán automáticamente los nuevos campos
3. Puedes actualizar manualmente los alumnos existentes si lo deseas

### Opcional: Actualizar alumnos existentes

Si quieres que los alumnos existentes se agrupen correctamente, puedes:

1. **Opción A:** Exportar la lista actual a Excel, agregar las columnas (Ciclo, Curso, Orientación, División) e importar nuevamente
2. **Opción B:** Actualizarlos manualmente desde el panel de administración

---

## ✅ Netlify - NO requiere cambios

**No necesitas hacer nada en Netlify.** El sitio funcionará automáticamente con los cambios realizados.

### ¿Por qué no requiere cambios?

- Los cambios son solo en el código frontend (HTML, CSS, JavaScript)
- No hay cambios en la configuración del servidor
- La biblioteca SheetJS se carga desde CDN (no requiere instalación)
- Firebase se conecta desde el cliente (no requiere configuración del servidor)

### Si ya tienes el sitio desplegado:

1. **Sube los archivos actualizados** a tu repositorio (si usas Git)
2. **O sube directamente** los archivos `index.html`, `script.js` y `styles.css` a Netlify
3. **Netlify hará el deploy automático** si tienes integración con Git

---

## 📋 Resumen de Cambios Implementados

### 1. Formulario de Registro
- ✅ Selector de Ciclo (CB/CS)
- ✅ Selector de Curso (1° a 4°)
- ✅ Selector de Orientación (INF/MEC) - Solo para CS
- ✅ Selector de División (1° a 4° para CB, 1° a 3° para 1° CS, 1° a 2° para 2°-4° CS)

### 2. Lista de Alumnos
- ✅ Agrupación por curso y división
- ✅ Ordenamiento: CB primero, luego CS
- ✅ Encabezados de grupo con contador de alumnos

### 3. Inscripciones al Comedor
- ✅ Agrupación por curso y división
- ✅ Ordenamiento igual que la lista de alumnos
- ✅ Encabezados de grupo con contador de inscripciones

### 4. Importación desde Excel
- ✅ Soporte para columnas: Ciclo, Curso, Orientación, División
- ✅ Construcción automática de `cursoDivision`
- ✅ Compatible con formato antiguo (sin nuevos campos)

---

## 🔧 Estructura de Cursos Implementada

### Ciclo Básico (CB)
- **CB 1°**: Divisiones 1°, 2°, 3°, 4°
- **CB 2°**: Divisiones 1°, 2°, 3°, 4°

### Ciclo Superior (CS)
- **CS 1° INF**: Divisiones 1°, 2°, 3°
- **CS 1° MEC**: Divisiones 1°, 2°, 3°
- **CS 2° INF**: Divisiones 1°, 2°
- **CS 2° MEC**: Divisiones 1°, 2°
- **CS 3° INF**: Divisiones 1°, 2°
- **CS 3° MEC**: Divisiones 1°, 2°
- **CS 4° INF**: Divisiones 1°, 2°
- **CS 4° MEC**: Divisiones 1°, 2°

---

## ✨ Todo está listo para usar

No necesitas hacer ningún cambio en Firebase o Netlify. Solo asegúrate de que los archivos actualizados estén desplegados y el sistema funcionará automáticamente.

