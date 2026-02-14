const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db/init');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const user = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const validPassword = bcrypt.compareSync(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = generateToken(user);

        res.json({
            message: 'Login exitoso',
            token,
            user: { id: user.id, username: user.username }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', (req, res) => {
    res.json({ message: 'Logout exitoso' });
});

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
        }

        const user = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const validPassword = bcrypt.compareSync(currentPassword, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);

        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

module.exports = router;
