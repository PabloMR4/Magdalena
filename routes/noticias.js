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
        cb(null, 'noticia-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
    }
});

// Get all noticias (public)
router.get('/', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const publicOnly = req.query.publicOnly !== 'false';

        let query = 'SELECT * FROM noticias';
        if (publicOnly) {
            query += ' WHERE publicado = 1';
        }
        query += ' ORDER BY fecha DESC LIMIT ? OFFSET ?';

        const noticias = db.prepare(query).all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM noticias' + (publicOnly ? ' WHERE publicado = 1' : '')).get();

        res.json({ noticias, total: total.count });
    } catch (error) {
        console.error('Error fetching noticias:', error);
        res.status(500).json({ error: 'Error al obtener noticias' });
    }
});

// Get single noticia (public)
router.get('/:id', (req, res) => {
    try {
        const noticia = db.prepare('SELECT * FROM noticias WHERE id = ?').get(req.params.id);
        if (!noticia) {
            return res.status(404).json({ error: 'Noticia no encontrada' });
        }
        res.json(noticia);
    } catch (error) {
        console.error('Error fetching noticia:', error);
        res.status(500).json({ error: 'Error al obtener noticia' });
    }
});

// Create noticia (protected)
router.post('/', authenticateToken, upload.single('imagen'), (req, res) => {
    try {
        const { titulo, contenido, publicado } = req.body;

        if (!titulo || !contenido) {
            return res.status(400).json({ error: 'Título y contenido son requeridos' });
        }

        const imagen = req.file ? '/uploads/' + req.file.filename : null;
        const pub = publicado === 'false' || publicado === '0' ? 0 : 1;

        const result = db.prepare(
            'INSERT INTO noticias (titulo, contenido, imagen, publicado) VALUES (?, ?, ?, ?)'
        ).run(titulo, contenido, imagen, pub);

        const noticia = db.prepare('SELECT * FROM noticias WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(noticia);
    } catch (error) {
        console.error('Error creating noticia:', error);
        res.status(500).json({ error: 'Error al crear noticia' });
    }
});

// Update noticia (protected)
router.put('/:id', authenticateToken, upload.single('imagen'), (req, res) => {
    try {
        const { titulo, contenido, publicado } = req.body;
        const id = req.params.id;

        const existing = db.prepare('SELECT * FROM noticias WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Noticia no encontrada' });
        }

        let imagen = existing.imagen;
        if (req.file) {
            // Delete old image if exists
            if (existing.imagen) {
                const oldPath = path.join(__dirname, '..', 'public', existing.imagen);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            imagen = '/uploads/' + req.file.filename;
        }

        const pub = publicado === 'false' || publicado === '0' ? 0 : 1;

        db.prepare(
            'UPDATE noticias SET titulo = ?, contenido = ?, imagen = ?, publicado = ? WHERE id = ?'
        ).run(titulo || existing.titulo, contenido || existing.contenido, imagen, pub, id);

        const noticia = db.prepare('SELECT * FROM noticias WHERE id = ?').get(id);
        res.json(noticia);
    } catch (error) {
        console.error('Error updating noticia:', error);
        res.status(500).json({ error: 'Error al actualizar noticia' });
    }
});

// Delete noticia (protected)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const noticia = db.prepare('SELECT * FROM noticias WHERE id = ?').get(req.params.id);
        if (!noticia) {
            return res.status(404).json({ error: 'Noticia no encontrada' });
        }

        // Delete image if exists
        if (noticia.imagen) {
            const imagePath = path.join(__dirname, '..', 'public', noticia.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        db.prepare('DELETE FROM noticias WHERE id = ?').run(req.params.id);
        res.json({ message: 'Noticia eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting noticia:', error);
        res.status(500).json({ error: 'Error al eliminar noticia' });
    }
});

module.exports = router;
