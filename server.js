const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const authRoutes = require('./routes/auth');
const noticiasRoutes = require('./routes/noticias');
const eventosRoutes = require('./routes/eventos');
const galeriaRoutes = require('./routes/galeria');
const contactoRoutes = require('./routes/contacto');

app.use('/api/auth', authRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/galeria', galeriaRoutes);
app.use('/api/contacto', contactoRoutes);

// API stats endpoint for admin dashboard
app.get('/api/stats', (req, res) => {
    try {
        const noticias = db.prepare('SELECT COUNT(*) as count FROM noticias').get();
        const eventos = db.prepare('SELECT COUNT(*) as count FROM eventos').get();
        const eventosProximos = db.prepare("SELECT COUNT(*) as count FROM eventos WHERE fecha_evento >= datetime('now')").get();
        const galeria = db.prepare('SELECT COUNT(*) as count FROM galeria').get();
        const mensajesNoLeidos = db.prepare('SELECT COUNT(*) as count FROM contacto WHERE leido = 0').get();
        const mensajesTotal = db.prepare('SELECT COUNT(*) as count FROM contacto').get();

        res.json({
            noticias: noticias.count,
            eventos: eventos.count,
            eventosProximos: eventosProximos.count,
            galeria: galeria.count,
            mensajesNoLeidos: mensajesNoLeidos.count,
            mensajesTotal: mensajesTotal.count
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Serve index.html for any other route (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);

    if (err instanceof require('multer').MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande' });
        }
        return res.status(400).json({ error: 'Error al subir archivo' });
    }

    res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Cofradía Santa María Magdalena de Hellín                ║
║   Servidor iniciado en http://localhost:${PORT}              ║
║                                                            ║
║   Panel de administración: http://localhost:${PORT}/admin.html ║
║   Usuario: admin                                           ║
║   Contraseña: cofradia2024                                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
