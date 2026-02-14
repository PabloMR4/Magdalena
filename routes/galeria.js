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
        cb(null, 'galeria-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for gallery images
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

// Get all images (public)
router.get('/', (req, res) => {
    try {
        const categoria = req.query.categoria;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        let query = 'SELECT * FROM galeria';
        const params = [];

        if (categoria && categoria !== 'todas') {
            query += ' WHERE categoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const imagenes = db.prepare(query).all(...params);

        let countQuery = 'SELECT COUNT(*) as count FROM galeria';
        if (categoria && categoria !== 'todas') {
            countQuery += ' WHERE categoria = ?';
        }
        const total = categoria && categoria !== 'todas'
            ? db.prepare(countQuery).get(categoria)
            : db.prepare(countQuery).get();

        // Get categories
        const categorias = db.prepare('SELECT DISTINCT categoria FROM galeria ORDER BY categoria').all();

        res.json({ imagenes, total: total.count, categorias: categorias.map(c => c.categoria) });
    } catch (error) {
        console.error('Error fetching galeria:', error);
        res.status(500).json({ error: 'Error al obtener galería' });
    }
});

// Get single image (public)
router.get('/:id', (req, res) => {
    try {
        const imagen = db.prepare('SELECT * FROM galeria WHERE id = ?').get(req.params.id);
        if (!imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }
        res.json(imagen);
    } catch (error) {
        console.error('Error fetching imagen:', error);
        res.status(500).json({ error: 'Error al obtener imagen' });
    }
});

// Upload image (protected)
router.post('/', authenticateToken, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Imagen requerida' });
        }

        const { titulo, categoria } = req.body;
        const imagen = '/uploads/' + req.file.filename;

        const result = db.prepare(
            'INSERT INTO galeria (titulo, imagen, categoria) VALUES (?, ?, ?)'
        ).run(titulo || '', imagen, categoria || 'general');

        const newImage = db.prepare('SELECT * FROM galeria WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newImage);
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Error al subir imagen' });
    }
});

// Upload multiple images (protected)
router.post('/multiple', authenticateToken, upload.array('imagenes', 20), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Al menos una imagen es requerida' });
        }

        const { categoria } = req.body;
        const insertStmt = db.prepare('INSERT INTO galeria (titulo, imagen, categoria) VALUES (?, ?, ?)');
        const uploaded = [];

        for (const file of req.files) {
            const imagen = '/uploads/' + file.filename;
            const result = insertStmt.run('', imagen, categoria || 'general');
            const newImage = db.prepare('SELECT * FROM galeria WHERE id = ?').get(result.lastInsertRowid);
            uploaded.push(newImage);
        }

        res.status(201).json({ message: `${uploaded.length} imágenes subidas`, imagenes: uploaded });
    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: 'Error al subir imágenes' });
    }
});

// Update image info (protected)
router.put('/:id', authenticateToken, (req, res) => {
    try {
        const { titulo, categoria } = req.body;
        const id = req.params.id;

        const existing = db.prepare('SELECT * FROM galeria WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        db.prepare('UPDATE galeria SET titulo = ?, categoria = ? WHERE id = ?').run(
            titulo !== undefined ? titulo : existing.titulo,
            categoria || existing.categoria,
            id
        );

        const imagen = db.prepare('SELECT * FROM galeria WHERE id = ?').get(id);
        res.json(imagen);
    } catch (error) {
        console.error('Error updating imagen:', error);
        res.status(500).json({ error: 'Error al actualizar imagen' });
    }
});

// Delete image (protected)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const imagen = db.prepare('SELECT * FROM galeria WHERE id = ?').get(req.params.id);
        if (!imagen) {
            return res.status(404).json({ error: 'Imagen no encontrada' });
        }

        // Delete file
        if (imagen.imagen) {
            const imagePath = path.join(__dirname, '..', 'public', imagen.imagen);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        db.prepare('DELETE FROM galeria WHERE id = ?').run(req.params.id);
        res.json({ message: 'Imagen eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting imagen:', error);
        res.status(500).json({ error: 'Error al eliminar imagen' });
    }
});

module.exports = router;
