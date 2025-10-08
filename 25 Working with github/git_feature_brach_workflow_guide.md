# ⚙️ Flujo de Trabajo Colaborativo con GitHub  
### _Feature Branch Workflow_

El siguiente flujo describe las buenas prácticas para trabajar en equipo con **Git y GitHub**, asegurando un desarrollo ordenado, control de versiones y colaboración eficiente.

---

## 🧭 Estructura general

Nadie trabaja directamente sobre la rama principal (`main` o `master`).  
Cada persona crea **una rama (branch)** por cada nueva funcionalidad, mejora o corrección.

---

## 🚀 Pasos del flujo

### 1️⃣ Clonar el repositorio

Cada desarrollador obtiene su copia local del repositorio remoto:

```bash
git clone https://github.com/empresa/proyecto.git
cd proyecto
```

---

### 2️⃣ Crear una nueva rama para tu tarea

Siempre parte de la rama principal actualizada:

```bash
git checkout main
git pull origin main
git checkout -b feature/nueva-funcionalidad
```

**📘 Ejemplos de nombres descriptivos:**
- `feature/login-system`
- `fix/navbar-alignment`
- `hotfix/security-patch`

---

### 3️⃣ Desarrollar y hacer commits locales

Trabaja en tu rama y guarda los avances de forma clara:

```bash
git add .
git commit -m "Agrega formulario de login con validaciones"
```

**🧩 Consejo:** Haz commits pequeños, enfocados y con mensajes descriptivos.

---

### 4️⃣ Sincronizar con la rama principal

Antes de subir tu rama, asegúrate de tener la última versión de `main`:

```bash
git checkout main
git pull origin main
git checkout feature/nueva-funcionalidad
git merge main
```

**🔧 Si hay conflictos:** Resuélvelos localmente y realiza un nuevo commit.

---

### 5️⃣ Subir la rama al repositorio remoto

Una vez tus cambios estén probados:

```bash
git push -u origin feature/nueva-funcionalidad
```

---

### 6️⃣ Crear un Pull Request (PR) en GitHub

Desde la interfaz de GitHub:

1. Abre un **Pull Request (PR)** desde tu rama hacia `main`
2. Describe los cambios realizados
3. Asigna revisores del equipo

**💬 Nota:** Los revisores pueden comentar, sugerir mejoras o aprobar tu PR. Una vez aprobado → se realiza el merge hacia `main`.

---

### 7️⃣ Eliminar la rama después del merge

Mantén tu repositorio limpio:

```bash
git branch -d feature/nueva-funcionalidad
git push origin --delete feature/nueva-funcionalidad
```

---

## 🧱 Estructura de ramas recomendada

| Rama | Propósito |
|------|-----------|
| `main` | Rama estable, lista para producción |
| `develop` | Rama de integración antes de producción |
| `feature/...` | Nuevas funcionalidades o mejoras |
| `fix/...` | Correcciones específicas |
| `hotfix/...` | Soluciones urgentes sobre main |

---

## 💡 Buenas prácticas

- ❌ **No hacer push directo a `main`**
- 🔁 **Sincroniza con frecuencia** (`git pull`) para evitar conflictos
- 🧠 **Usa GitHub Issues o Projects** para gestionar tareas
- ✅ **Configura revisiones obligatorias** de PR en GitHub
- 🏷️ **Usa mensajes de commit claros** y consistentes (ej. [Conventional Commits](https://www.conventionalcommits.org/))

---

## ⚡ Opcional: Automatización y control

- **GitHub Actions** → CI/CD (integración y despliegue automáticos)
- **Protección de ramas** → evitar merges directos a `main`
- **Revisiones obligatorias** → mantener la calidad del código

---

## 💬 Conclusión

Cada cambio va en su propia rama, se revisa mediante Pull Request y se integra a `main` solo cuando ha sido aprobado y probado.

**Con este flujo garantizamos orden, trazabilidad y colaboración efectiva entre los equipos de desarrollo.**