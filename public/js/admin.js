/**
 * Cofradía Santa María Magdalena - Admin Panel JavaScript
 */

// State
let authToken = localStorage.getItem('adminToken');
let currentSection = 'dashboard';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        verifyToken();
    } else {
        showLogin();
    }

    initEventListeners();
});

/**
 * Event Listeners
 */
function initEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            showSection(section);
        });
    });
}

/**
 * Authentication
 */
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            showAdminPanel();
            loadDashboard();
        } else {
            errorDiv.textContent = data.error || 'Error de autenticación';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'Error de conexión';
        errorDiv.style.display = 'block';
    }
}

async function verifyToken() {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showAdminPanel();
            loadDashboard();
        } else {
            handleLogout();
        }
    } catch (error) {
        handleLogout();
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    showLogin();
}

function showLogin() {
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
}

/**
 * Navigation
 */
function showSection(sectionName) {
    currentSection = sectionName;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionName);
    });

    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.toggle('active', section.id === `section-${sectionName}`);
    });

    // Load section data
    switch (sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'noticias':
            loadNoticiasAdmin();
            break;
        case 'eventos':
            loadEventosAdmin();
            break;
        case 'galeria':
            loadGaleriaAdmin();
            break;
        case 'mensajes':
            loadMensajesAdmin();
            break;
    }
}

/**
 * Dashboard
 */
async function loadDashboard() {
    try {
        const response = await fetch('/api/stats', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-noticias').textContent = stats.noticias;
            document.getElementById('stat-eventos').textContent = stats.eventosProximos;
            document.getElementById('stat-galeria').textContent = stats.galeria;
            document.getElementById('stat-mensajes').textContent = stats.mensajesNoLeidos;

            // Update badge
            const badge = document.getElementById('unread-badge');
            if (stats.mensajesNoLeidos > 0) {
                badge.textContent = stats.mensajesNoLeidos;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

/**
 * Noticias Management
 */
async function loadNoticiasAdmin() {
    const tbody = document.getElementById('noticias-table-body');

    try {
        const response = await fetch('/api/noticias?publicOnly=false', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.noticias && data.noticias.length > 0) {
            tbody.innerHTML = data.noticias.map(noticia => `
                <tr>
                    <td>
                        ${noticia.imagen
                            ? `<img src="${noticia.imagen}" alt="${noticia.titulo}">`
                            : '<span style="color: #999;">Sin imagen</span>'
                        }
                    </td>
                    <td>${noticia.titulo}</td>
                    <td>${formatDate(noticia.fecha)}</td>
                    <td>
                        <span class="status-badge ${noticia.publicado ? 'published' : 'draft'}">
                            ${noticia.publicado ? 'Publicado' : 'Borrador'}
                        </span>
                    </td>
                    <td class="table-actions">
                        <button class="btn btn-secondary btn-small" onclick="editNoticia(${noticia.id})">Editar</button>
                        <button class="btn btn-danger btn-small" onclick="deleteNoticia(${noticia.id})">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay noticias</td></tr>';
        }
    } catch (error) {
        console.error('Error loading noticias:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="error">Error al cargar noticias</td></tr>';
    }
}

function openNoticiaForm(noticia = null) {
    const isEdit = noticia !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Editar Noticia' : 'Nueva Noticia';

    document.getElementById('modal-body').innerHTML = `
        <form id="noticia-form" enctype="multipart/form-data">
            <input type="hidden" id="noticia-id" value="${isEdit ? noticia.id : ''}">
            <div class="form-group">
                <label for="noticia-titulo">Título *</label>
                <input type="text" id="noticia-titulo" value="${isEdit ? noticia.titulo : ''}" required>
            </div>
            <div class="form-group">
                <label for="noticia-contenido">Contenido *</label>
                <textarea id="noticia-contenido" rows="6" required>${isEdit ? noticia.contenido : ''}</textarea>
            </div>
            <div class="form-group">
                <label for="noticia-imagen">Imagen</label>
                <input type="file" id="noticia-imagen" accept="image/*">
                ${isEdit && noticia.imagen ? `<p style="margin-top:5px;font-size:0.9rem;">Imagen actual: ${noticia.imagen}</p>` : ''}
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="noticia-publicado" ${!isEdit || noticia.publicado ? 'checked' : ''}>
                    Publicar
                </label>
            </div>
            <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Guardar cambios' : 'Crear noticia'}</button>
        </form>
    `;

    document.getElementById('noticia-form').addEventListener('submit', handleNoticiaSubmit);
    openModal();
}

async function handleNoticiaSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('noticia-id').value;
    const isEdit = id !== '';

    const formData = new FormData();
    formData.append('titulo', document.getElementById('noticia-titulo').value);
    formData.append('contenido', document.getElementById('noticia-contenido').value);
    formData.append('publicado', document.getElementById('noticia-publicado').checked);

    const imagen = document.getElementById('noticia-imagen').files[0];
    if (imagen) {
        formData.append('imagen', imagen);
    }

    try {
        const url = isEdit ? `/api/noticias/${id}` : '/api/noticias';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (response.ok) {
            showToast(isEdit ? 'Noticia actualizada' : 'Noticia creada', 'success');
            closeModal();
            loadNoticiasAdmin();
            loadDashboard();
        } else {
            const data = await response.json();
            showToast(data.error || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    }
}

async function editNoticia(id) {
    try {
        const response = await fetch(`/api/noticias/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const noticia = await response.json();
            openNoticiaForm(noticia);
        }
    } catch (error) {
        showToast('Error al cargar noticia', 'error');
    }
}

async function deleteNoticia(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta noticia?')) return;

    try {
        const response = await fetch(`/api/noticias/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showToast('Noticia eliminada', 'success');
            loadNoticiasAdmin();
            loadDashboard();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

/**
 * Eventos Management
 */
async function loadEventosAdmin() {
    const tbody = document.getElementById('eventos-table-body');

    try {
        const response = await fetch('/api/eventos', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.eventos && data.eventos.length > 0) {
            tbody.innerHTML = data.eventos.map(evento => `
                <tr>
                    <td>${evento.titulo}</td>
                    <td>${formatDateTime(evento.fecha_evento)}</td>
                    <td>${evento.lugar || '-'}</td>
                    <td class="table-actions">
                        <button class="btn btn-secondary btn-small" onclick="editEvento(${evento.id})">Editar</button>
                        <button class="btn btn-danger btn-small" onclick="deleteEvento(${evento.id})">Eliminar</button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay eventos</td></tr>';
        }
    } catch (error) {
        console.error('Error loading eventos:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="error">Error al cargar eventos</td></tr>';
    }
}

function openEventoForm(evento = null) {
    const isEdit = evento !== null;
    document.getElementById('modal-title').textContent = isEdit ? 'Editar Evento' : 'Nuevo Evento';

    const fechaValue = isEdit ? evento.fecha_evento.slice(0, 16) : '';

    document.getElementById('modal-body').innerHTML = `
        <form id="evento-form" enctype="multipart/form-data">
            <input type="hidden" id="evento-id" value="${isEdit ? evento.id : ''}">
            <div class="form-group">
                <label for="evento-titulo">Título *</label>
                <input type="text" id="evento-titulo" value="${isEdit ? evento.titulo : ''}" required>
            </div>
            <div class="form-group">
                <label for="evento-descripcion">Descripción</label>
                <textarea id="evento-descripcion" rows="4">${isEdit ? (evento.descripcion || '') : ''}</textarea>
            </div>
            <div class="form-group">
                <label for="evento-fecha">Fecha y hora *</label>
                <input type="datetime-local" id="evento-fecha" value="${fechaValue}" required>
            </div>
            <div class="form-group">
                <label for="evento-lugar">Lugar</label>
                <input type="text" id="evento-lugar" value="${isEdit ? (evento.lugar || '') : ''}">
            </div>
            <div class="form-group">
                <label for="evento-imagen">Imagen</label>
                <input type="file" id="evento-imagen" accept="image/*">
            </div>
            <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Guardar cambios' : 'Crear evento'}</button>
        </form>
    `;

    document.getElementById('evento-form').addEventListener('submit', handleEventoSubmit);
    openModal();
}

async function handleEventoSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('evento-id').value;
    const isEdit = id !== '';

    const formData = new FormData();
    formData.append('titulo', document.getElementById('evento-titulo').value);
    formData.append('descripcion', document.getElementById('evento-descripcion').value);
    formData.append('fecha_evento', document.getElementById('evento-fecha').value);
    formData.append('lugar', document.getElementById('evento-lugar').value);

    const imagen = document.getElementById('evento-imagen').files[0];
    if (imagen) {
        formData.append('imagen', imagen);
    }

    try {
        const url = isEdit ? `/api/eventos/${id}` : '/api/eventos';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (response.ok) {
            showToast(isEdit ? 'Evento actualizado' : 'Evento creado', 'success');
            closeModal();
            loadEventosAdmin();
            loadDashboard();
        } else {
            const data = await response.json();
            showToast(data.error || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    }
}

async function editEvento(id) {
    try {
        const response = await fetch(`/api/eventos/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const evento = await response.json();
            openEventoForm(evento);
        }
    } catch (error) {
        showToast('Error al cargar evento', 'error');
    }
}

async function deleteEvento(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento?')) return;

    try {
        const response = await fetch(`/api/eventos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showToast('Evento eliminado', 'success');
            loadEventosAdmin();
            loadDashboard();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

/**
 * Galería Management
 */
async function loadGaleriaAdmin() {
    const grid = document.getElementById('galeria-admin-grid');

    try {
        const response = await fetch('/api/galeria', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.imagenes && data.imagenes.length > 0) {
            grid.innerHTML = data.imagenes.map(img => `
                <div class="gallery-admin-item">
                    <img src="${img.imagen}" alt="${img.titulo || 'Imagen'}">
                    <div class="item-overlay">
                        <button class="btn btn-danger btn-small" onclick="deleteGaleriaItem(${img.id})">Eliminar</button>
                    </div>
                    <div class="item-info">
                        <p>${img.titulo || 'Sin título'}</p>
                        <p>${img.categoria}</p>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="empty-state"><p>No hay imágenes en la galería</p></div>';
        }
    } catch (error) {
        console.error('Error loading galeria:', error);
        grid.innerHTML = '<div class="error">Error al cargar la galería</div>';
    }
}

function openGaleriaForm() {
    document.getElementById('modal-title').textContent = 'Subir Imagen';

    document.getElementById('modal-body').innerHTML = `
        <form id="galeria-form" enctype="multipart/form-data">
            <div class="form-group">
                <label for="galeria-imagen">Imagen *</label>
                <input type="file" id="galeria-imagen" accept="image/*" required>
            </div>
            <div class="form-group">
                <label for="galeria-titulo">Título</label>
                <input type="text" id="galeria-titulo">
            </div>
            <div class="form-group">
                <label for="galeria-categoria">Categoría</label>
                <select id="galeria-categoria">
                    <option value="general">General</option>
                    <option value="procesiones">Procesiones</option>
                    <option value="eventos">Eventos</option>
                    <option value="historia">Historia</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-block">Subir imagen</button>
        </form>
    `;

    document.getElementById('galeria-form').addEventListener('submit', handleGaleriaSubmit);
    openModal();
}

async function handleGaleriaSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('imagen', document.getElementById('galeria-imagen').files[0]);
    formData.append('titulo', document.getElementById('galeria-titulo').value);
    formData.append('categoria', document.getElementById('galeria-categoria').value);

    try {
        const response = await fetch('/api/galeria', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (response.ok) {
            showToast('Imagen subida correctamente', 'success');
            closeModal();
            loadGaleriaAdmin();
            loadDashboard();
        } else {
            const data = await response.json();
            showToast(data.error || 'Error al subir imagen', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    }
}

async function deleteGaleriaItem(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen?')) return;

    try {
        const response = await fetch(`/api/galeria/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showToast('Imagen eliminada', 'success');
            loadGaleriaAdmin();
            loadDashboard();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

/**
 * Mensajes Management
 */
async function loadMensajesAdmin() {
    const list = document.getElementById('mensajes-list');

    try {
        const response = await fetch('/api/contacto', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.mensajes && data.mensajes.length > 0) {
            list.innerHTML = data.mensajes.map(msg => `
                <div class="message-item ${msg.leido ? '' : 'unread'}">
                    <div class="message-header">
                        <div>
                            <span class="message-sender">${msg.nombre}</span>
                            <span class="message-email">&lt;${msg.email}&gt;</span>
                        </div>
                        <span class="message-date">${formatDateTime(msg.created_at)}</span>
                    </div>
                    <div class="message-content">${msg.mensaje}</div>
                    <div class="message-actions">
                        ${!msg.leido ? `<button class="btn btn-secondary btn-small" onclick="markAsRead(${msg.id})">Marcar como leído</button>` : ''}
                        <button class="btn btn-danger btn-small" onclick="deleteMensaje(${msg.id})">Eliminar</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<div class="empty-state"><p>No hay mensajes</p></div>';
        }
    } catch (error) {
        console.error('Error loading mensajes:', error);
        list.innerHTML = '<div class="error">Error al cargar mensajes</div>';
    }
}

async function markAsRead(id) {
    try {
        const response = await fetch(`/api/contacto/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            loadMensajesAdmin();
            loadDashboard();
        }
    } catch (error) {
        showToast('Error al marcar mensaje', 'error');
    }
}

async function markAllRead() {
    try {
        const response = await fetch('/api/contacto/mark-all-read', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showToast('Todos los mensajes marcados como leídos', 'success');
            loadMensajesAdmin();
            loadDashboard();
        }
    } catch (error) {
        showToast('Error al marcar mensajes', 'error');
    }
}

async function deleteMensaje(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este mensaje?')) return;

    try {
        const response = await fetch(`/api/contacto/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            showToast('Mensaje eliminado', 'success');
            loadMensajesAdmin();
            loadDashboard();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
    }
}

/**
 * Modal functions
 */
function openModal() {
    document.getElementById('modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal on outside click
document.getElementById('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

/**
 * Toast notifications
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Utility functions
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
