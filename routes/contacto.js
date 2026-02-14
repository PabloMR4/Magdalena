const express = require('express');
const router = express.Router();
const db = require('../db/init');
const { authenticateToken } = require('../middleware/auth');

// Send contact message (public)
router.post('/', (req, res) => {
    try {
        const { nombre, email, mensaje } = req.body;

        if (!nombre || !email || !mensaje) {
            return res.status(400).json({ error: 'Nombre, email y mensaje son requeridos' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email no válido' });
        }

        const result = db.prepare(
            'INSERT INTO contacto (nombre, email, mensaje) VALUES (?, ?, ?)'
        ).run(nombre, email, mensaje);

        res.status(201).json({
            message: 'Mensaje enviado correctamente. Nos pondremos en contacto pronto.',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Error sending contact message:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

// Get all messages (protected)
router.get('/', authenticateToken, (req, res) => {
    try {
        const unreadOnly = req.query.unread === 'true';
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        let query = 'SELECT * FROM contacto';
        if (unreadOnly) {
            query += ' WHERE leido = 0';
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const mensajes = db.prepare(query).all(limit, offset);
        const total = db.prepare('SELECT COUNT(*) as count FROM contacto' + (unreadOnly ? ' WHERE leido = 0' : '')).get();
        const unreadCount = db.prepare('SELECT COUNT(*) as count FROM contacto WHERE leido = 0').get();

        res.json({ mensajes, total: total.count, unread: unreadCount.count });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Error al obtener mensajes' });
    }
});

// Get single message (protected)
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const mensaje = db.prepare('SELECT * FROM contacto WHERE id = ?').get(req.params.id);
        if (!mensaje) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }
        res.json(mensaje);
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ error: 'Error al obtener mensaje' });
    }
});

// Mark message as read (protected)
router.put('/:id/read', authenticateToken, (req, res) => {
    try {
        const mensaje = db.prepare('SELECT * FROM contacto WHERE id = ?').get(req.params.id);
        if (!mensaje) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        db.prepare('UPDATE contacto SET leido = 1 WHERE id = ?').run(req.params.id);
        res.json({ message: 'Mensaje marcado como leído' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Error al marcar mensaje' });
    }
});

// Mark all as read (protected)
router.put('/mark-all-read', authenticateToken, (req, res) => {
    try {
        db.prepare('UPDATE contacto SET leido = 1 WHERE leido = 0').run();
        res.json({ message: 'Todos los mensajes marcados como leídos' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Error al marcar mensajes' });
    }
});

// Delete message (protected)
router.delete('/:id', authenticateToken, (req, res) => {
    try {
        const mensaje = db.prepare('SELECT * FROM contacto WHERE id = ?').get(req.params.id);
        if (!mensaje) {
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        db.prepare('DELETE FROM contacto WHERE id = ?').run(req.params.id);
        res.json({ message: 'Mensaje eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'Error al eliminar mensaje' });
    }
});

module.exports = router;
