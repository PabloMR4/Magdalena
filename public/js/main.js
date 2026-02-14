/**
 * Cofradía Santa María Magdalena - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadNoticias();
    loadEventos();
});

/**
 * Navigation functionality
 */
function initNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });

        // Close menu when clicking a link
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }
}

/**
 * Load latest noticias for homepage
 */
async function loadNoticias() {
    const container = document.getElementById('noticias-container');
    if (!container) return;

    try {
        const response = await fetch('/api/noticias?limit=3');
        const data = await response.json();

        if (data.noticias && data.noticias.length > 0) {
            container.innerHTML = data.noticias.map(noticia => `
                <article class="noticia-card">
                    <div class="noticia-card-image">
                        ${noticia.imagen
                            ? `<img src="${noticia.imagen}" alt="${noticia.titulo}">`
                            : '<span>SMM</span>'
                        }
                    </div>
                    <div class="noticia-card-content">
                        <span class="noticia-card-date">${formatDate(noticia.fecha)}</span>
                        <h3>${noticia.titulo}</h3>
                        <p>${truncateText(noticia.contenido, 150)}</p>
                    </div>
                </article>
            `).join('');

            // Show "ver más" button if there are more noticias
            const verMasBtn = document.getElementById('ver-mas-noticias');
            if (verMasBtn && data.total > 3) {
                verMasBtn.style.display = 'inline-block';
            }
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No hay noticias disponibles en este momento.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading noticias:', error);
        container.innerHTML = '<p class="error">Error al cargar las noticias</p>';
    }
}

/**
 * Load upcoming eventos for homepage
 */
async function loadEventos() {
    const container = document.getElementById('eventos-container');
    if (!container) return;

    try {
        const response = await fetch('/api/eventos?upcoming=true&limit=3');
        const data = await response.json();

        if (data.eventos && data.eventos.length > 0) {
            container.innerHTML = data.eventos.map(evento => {
                const fecha = new Date(evento.fecha_evento);
                return `
                    <div class="evento-item">
                        <div class="evento-date">
                            <span class="day">${fecha.getDate()}</span>
                            <span class="month">${fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</span>
                            <span class="year">${fecha.getFullYear()}</span>
                        </div>
                        <div class="evento-info">
                            <h3>${evento.titulo}</h3>
                            <p>${evento.descripcion || ''}</p>
                            ${evento.lugar ? `<p><strong>Lugar:</strong> ${evento.lugar}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No hay eventos próximos programados.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading eventos:', error);
        container.innerHTML = '<p class="error">Error al cargar los eventos</p>';
    }
}

/**
 * Utility functions
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Smooth scroll for anchor links
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
