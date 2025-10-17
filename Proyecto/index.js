const express = require('express');
const { engine } = require('express-handlebars');
const pool = require('./database/db'); // Importar la conexión
const app = express();
const port = 3000;


app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

function parseNumber(str){
  if(typeof str !== 'string') return NaN;
  var s = str.trim();
  s = s.replace(/\./g, '');
  s = s.replace(/\,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

app.post('/simulation', (req, res) => {
  const { rut, monto, renta, cuotas, fechaPrimerPago } = req.body;
  res.render('sim-results', { title: 'Resultado', rut, monto, cuotas, renta, fechaPrimerPago});
});

app.get('/simulator', (req, res) => {
  res.render('simulator', {style: 'simulator.css', title: 'Simulador Crédito de Consumo', js: 'simulator.js'})
})

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});


/* 
-------TO DO LIST-------
- boton de "continuar" aka hacer la solicitud podría borrar el historial guardado en la bdd por el cliente -> historial temporal
- hacer bien cálculos de la simulación
- css + js de sim-results
- guardar solicitudes (temporalemnte)
- poder cargar previas solicitudes para hacer la solicitud
- migraciones de la bdd ?
*/