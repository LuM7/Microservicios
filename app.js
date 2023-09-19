const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const secret = 'tokenlogin2023';

// Conectar a la base de datos SQLite
const db = new sqlite3.Database(process.env.DATABASE_URL);
const verificarToken = require('./verificarToken');


// Middleware para permitir JSON en las solicitudes
app.use(express.json());
const resetTokens = {};
app.use(bodyParser.json());


app.use(express.static(__dirname));
// Crear la tabla de usuarios si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    contrasena TEXT NOT NULL,
    email TEXT NOT NULL
  )
`, (err) => {
    if (err) {
        console.error('Error al crear la tabla usuarios:', err.message);
    } else {
        console.log('Tabla usuarios creada o ya existente');
    }
});

// Ruta para obtener todos los usuarios
app.get('/usuarios', (req, res) => {
    const page = req.query.page || 1; // Página actual
    const perPage = req.query.perPage || 10; // Usuarios por página
    const offset = (page - 1) * perPage;

    const countQuery = 'SELECT COUNT(*) AS total FROM usuarios';
    const usersQuery = `SELECT * FROM usuarios LIMIT ${perPage} OFFSET ${offset}`;

    db.get(countQuery, [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Error en el servidor' });
        }

        const totalUsers = row.total;

        db.all(usersQuery, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Error en el servidor' });
            }

            res.json({
                page,
                perPage,
                totalUsers,
                users: rows,
            });
        });
    });
});

// Ruta para agregar un nuevo usuario
app.post('/usuarios', (req, res) => {
    const { nombre, contrasena, email } = req.body;

    if (!nombre || !contrasena || !email) {
        res.status(400).json({ error: 'Todos los campos son obligatorios' });
        return;
    }

    // Verificar si el correo electrónico ya existe en la base de datos
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Error en el servidor' });
            return;
        }

        if (row) {
            // Si el correo electrónico ya existe, responder con un error
            res.status(400).json({ error: 'El correo electrónico ya está registrado' });
            return;
        }

        // Si el correo electrónico no existe, insertar el nuevo usuario en la base de datos
        const query = 'INSERT INTO usuarios (nombre, contrasena, email) VALUES (?, ?, ?)';
        db.run(query, [nombre, contrasena, email], (err) => {
            if (err) {
                console.error(err.message);
                res.status(500).json({ error: 'Error en el servidor' });
                return;
            }
            res.json({ message: 'Usuario agregado con éxito' });
        });
    });
});

// Ruta para actualizar los datos de un usuario por ID
app.put('/usuarios/:id', async (req, res) => {
    const userId = req.params.id;
    const { nombre, email } = req.body;

    if (!userId || (!nombre && !email)) {
        res.status(400).json({ error: 'Se requiere al menos un campo para actualizar (nombre o email)' });
        return;
    }

    // Verificar si el usuario existe en la base de datos
    const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM usuarios WHERE id = ?', [userId], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });

    if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
    }

    // Construir la consulta SQL para actualizar los campos proporcionados
    const updateFields = [];
    const updateValues = [];

    if (nombre) {
        updateFields.push('nombre = ?');
        updateValues.push(nombre);
    }

    if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
    }

    const updateQuery = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`;
    updateValues.push(userId);

    db.run(updateQuery, updateValues, (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Error en el servidor' });
            return;
        }
        res.json({ message: 'Datos de usuario actualizados con éxito' });
    });
});


// Ruta para eliminar un usuario por ID
app.delete('/usuarios/:id', (req, res) => {
    const userId = req.params.id;

    if (!userId) {
        res.status(400).json({ error: 'ID de usuario no proporcionado' });
        return;
    }

    const query = 'DELETE FROM usuarios WHERE id = ?';
    db.run(query, [userId], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Error en el servidor' });
            return;
        }
        res.json({ message: 'Usuario eliminado con éxito' });
    });
});

// Ruta para el inicio de sesión de usuario
app.post('/sesion', async (req, res) => {
    const { email, contrasena } = req.body;

    // Validar los datos de inicio de sesión
    if (!email || !contrasena) {
        res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        return;
    }

    // Verificar si el usuario existe en la base de datos
    const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM usuarios WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });

    if (!user || contrasena !== user.contrasena) {
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
    }

    // Generar un token JWT con los datos del usuario
    const token = jwt.sign({ userId: user.id }, secret, { expiresIn: '1h' });

    // Enviar el token como respuesta
    res.json({ message: 'Inicio de sesión exitoso', token });
    fs.writeFileSync('token.txt', token);


});


// Ruta para actualizar la contraseña del usuario
app.put('/usuarios/:id/clave', verificarToken, async (req, res) => {
    const userId = req.params.id;
    const { contrasenaActual, nuevaContrasena } = req.body;

    if (!userId || !contrasenaActual || !nuevaContrasena) {
        res.status(400).json({ error: 'Todos los campos son obligatorios' });
        return;
    }

    // Aquí agregamos una impresión para mostrar el token recibido
    console.log('Token recibido en la solicitud PUT:', req.header('Authorization'));
    console.log('Token recibido en la solicitud PUT:', req.header('Authorization'));
    // Verificar si el usuario existe en la base de datos
    const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM usuarios WHERE id = ?', [userId], (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
        });
    });

    if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
    }

    // Verificar que la contraseña actual coincida con la almacenada en la base de datos
    if (user.contrasena !== contrasenaActual) {
        res.status(401).json({ error: 'Contraseña actual incorrecta' });
        return;
    }

    // Actualizar la contraseña del usuario en la base de datos
    const updateQuery = 'UPDATE usuarios SET contrasena = ? WHERE id = ?';
    db.run(updateQuery, [nuevaContrasena, userId], (err) => {
        if (err) {
            console.error(err.message);
            res.status(500).json({ error: 'Error en el servidor' });
            return;
        }
        res.json({ message: 'Contraseña actualizada con éxito' });
    });
});


// Ruta para solicitar recuperación de contraseña
app.post('/recuperacion-contrasena', (req, res) => {
    const { email } = req.body;

    // Generar un token de recuperación de contraseña
    const resetToken = uuidv4();
    const expirationTime = new Date(Date.now() + 30 * 60 * 1000);
    resetTokens[email] = { token: resetToken, expirationTime };


    // Aquí solo mostramos el token generado
    return res.status(200).json({ mensaje: 'Se ha generado un token de recuperación', token: resetToken });
});

// Ruta para restablecer la contraseña
app.post('/restablecimiento-contrasena', (req, res) => {
    const { email, new_password, reset_token } = req.body;

    // Verificar si el token coincide con el token almacenado
    if (resetTokens[email]) {
        const tokenInfo = resetTokens[email];
        const token = tokenInfo.token;
        const expirationTime = tokenInfo.expirationTime;

        if (token === reset_token && expirationTime > new Date()) {
            // En un escenario real, aquí actualizarías la contraseña en la base de datos
            // Simulación: imprimimos la nueva contraseña
            console.log(`Nueva contraseña para ${email}: ${new_password}`);

            delete resetTokens[email]; // Eliminar el token después de su uso

            return res.status(200).json({ mensaje: 'Contraseña actualizada exitosamente' });
        } else {
            return res.status(400).json({ mensaje: 'Token de recuperación inválido o expirado' });
        }
    } else {
        return res.status(400).json({ mensaje: 'No se encontró el token de recuperación' });
    }
});





// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
