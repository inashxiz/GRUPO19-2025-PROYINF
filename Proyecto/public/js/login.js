app.post('/login', async (req, res) => {
    try {
        const { rut, password } = req.body;
        const result = await pool.query('SELECT * FROM users WHERE rut = $1', [rut]);

        if (result.rows.length === 0) {
            return res.render('login', {
                style: 'simulator.css',
                js: 'login.js',
                title: 'Iniciar Sesión',
                error: 'Usuario no encontrado'
            });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            return res.render('login', {
                style: 'simulator.css',
                js: 'login.js',
                title: 'Iniciar Sesión',
                error: 'Contraseña incorrecta'
            });
        }

        req.session.user = { id: user.id, rut: user.rut, nombre: user.nombre };
        res.redirect('/solicitud');

    } catch (e) {
        res.render('login', {
            style: 'simulator.css',
            js: 'login.js',
            title: 'Iniciar Sesión',
            error: 'Error del servidor'
        });
    }
});
