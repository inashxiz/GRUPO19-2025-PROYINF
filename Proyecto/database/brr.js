const pool = require('./db'); // tu archivo db.js

async function showTables() {
    try {
        const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

        console.log('Tablas en la base de datos:');
        result.rows.forEach(row => console.log('- ' + row.table_name));
    } catch (err) {
        console.error('Error al listar tablas:', err);
    } finally {
        pool.end(); // cerrar conexiones
    }
}

showTables();
