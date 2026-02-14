const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evento-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes'));
    }
});

// Get all eventos (public)
router.get('/', (req, res) => {
    try {
        const upcoming = req.query.upcoming === 'true';
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        let query = 'SELECT * FROM eventos';
        if (upcoming) {
            query += " WHERE fecha_evento >= datetime('now')";
        }
        query += ' ORDER BY fecha_evento ASC LIMIT ? OFFSET ?';

        const eventos = db.prepare(query).all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM eventos' + (upcoming ? " WHERE fecha_evento >= datetime('now')" : '')).get();

        res.json({ eventos, total: total.count });
    } catch (error) {
        console.error('Error fetching eventos:', error);
        res.status(500).json({ error: 'Error al obtener eventos' });
    }
});

// Get single evento (public)
router.get('/:id', (req, res) => {
    try {
        const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }
        res.json(evento);
    } catch (error) {
        console.error('Error fetching evento:', error);
        res.status(500).json({ error: 'Error al obtener evento' });
    }
});

// Create evento (protected)
router.post('/', authenticateToken, upload.single('imagen'), (req, res) => {
    try {
        const { titulo, descripcion, fecha_evento, lugar } = req.body;

        if (!titulo || !fecha_evento) {
            return res.status(400).json({ error: 'Título y fecha del evento son requeridos' });
        }

        const imagen = req.file ? '/uploads/' + req.file.filename : null;

        const result = db.prepare(
            'INSERT INTO eventos (titulo, descripcion, fecha_evento, lugar, imagen) VALUES (?, ?, ?, ?, ?)'
        ).run(titulo, descripcion || '', fecha_evento, lugar || '', imagen);

        const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(evento);
    } catch (error) {
        console.error('Error creating evento:', error);
        res.status(500).json({ error: 'Error al crear evento' });
    }
});

// Update evento (protected)
router.put('/:id', authenticateToken, upload.single('imagen'), (req, res) => {
    try {
        const { titulo, descripcion, fecha_evento, lugar } = req.body;
        const id = req.params.id;

        const existing = db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        let imagen = existing.imagen;
        if (req.file) {
            if (existing.imagen) {
                const oldPath = path.join(__dirname, '..', 'public', existing.imagen);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            imagen = '/uploads/' + req.file.filename;
        }

        db.prepare(
            'UPDATE eventos SET titulo = ?, descripcion = ?, fecha_evento = ?, lugar = ?, imagen = ? WHERE id = ?'
        ).run(
            titulo || existing.titulo,
            descripcion || existing.descripcion,
            fecha_evento || existing.fecha_evento,
            lugar || existing.lugar,
            imagen,
            id
        );

        const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(id);
        res.json(evento);
    } catch (error) {
        console.error('Error updating evento:', error);
        res.status(500).json({ error: 'Error al actualizar evento' });
    }
});

// Delete evento (protected)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
        if (!evento) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        if (evento.imagen) {
            const imagePath = path.join(__dirname, '..', 'public', evento.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
        res.json({ message: 'Evento eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting evento:', error);
        res.status(500).json({ error: 'Error al eliminar evento' });
    }
});

module.exports = router;
