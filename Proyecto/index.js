const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session')
const pool = require('./database/db'); // Importar la conexión
const { redirect } = require('express/lib/response');
const app = express();
const port = 3000;


app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(session ({
  secret: 'supermegagigachadsecretuser',
  resave: false,
  saveUninitialized: true,
  cookie: {maxAge: 1000*60*30} //sesión expira después de 30 mins (podemos cambiarlo después si es necesario)
}));
app.use((req, res, next) => {
  if (!req.session.simulations) req.session.simulations = [];
  next();
});
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

function monthlyInterestRate(monto, cuotas){
  /*
  -----NOTA-----
  usé las tasas, rango de montos y rango de cuotas del banco BCI, así que pueden cambiar en el futuro
  para modificar las tasas simplemente hay que modificar esta función.
  OJO!
    - el mínimo de cuotas es 6 y el máximo 60
    - el monto mínimo que se puede ingresar es $500.000
  */
  if (monto >= 500000 && monto <= 2999999){
    if (cuotas >= 6 && cuotas <= 35) return 0.0219;
    else return 0.0217;
  } else if (monto >= 3000000 && monto <= 6999999){
    if (cuotas >= 6 && cuotas <= 35) return 0.0155;
    else return 0.0153;
  } else if (monto >= 7000000 && monto <= 11999999){
    if (cuotas >= 6 && cuotas <= 35) return 0.0134;
    else return 0.0132;
  } else if (monto >= 12000000 && monto <= 22999999){
    if (cuotas >= 6 && cuotas <= 35) return 0.0112;
    else return 0.0110;
  } else if (monto >= 23000000 && monto <= 30999999){
    if (cuotas >= 6 && cuotas <= 35) return 0.0107;
    else return 0.0105;
  } else {
    if (cuotas >= 6 && cuotas <= 35) return 0.0101;
    else return 0.0099;
  }
}

function monthlyCuota(monto, cuotas, tasaInteres){
  const numer = tasaInteres*(Math.pow((1+tasaInteres), cuotas));
  const denom = Math.pow((1+tasaInteres), cuotas) - 1;
  const cuota = monto*(numer/denom);
  return Math.round(cuota);
}

function monthlyIrr(cashFlow, guess = 0.01){
  var rate = guess;
  for(var i = 0; i < 100; i++){
    var f = 0, df = 0;
    for(var t = 0; t < cashFlow.length; t++){
      const denom = Math.pow(1 + rate, t);
      f += cashFlow[t]/denom;
      df -= t*cashFlow[t]/(denom*(1+rate));
    }
    const newRate = rate - f/df;
    if(Math.abs(newRate - rate) < 1e-10) break;
    rate = newRate;
  }
  return rate;
}

function simulateCAE(monto, cuotaMensual, cuotas){
  const cashFlow = [monto, ...Array(cuotas).fill(-cuotaMensual)];
  const monthlyR = monthlyIrr(cashFlow);
  const cae = Math.pow(1 + monthlyR, 12) - 1;

  return cae*100;
}

function buildSimulationSnapshot({rut, renta, monto, cuotas, fechaPrimerPago}){
  const _monto = parseNumber(monto);
  const _cuotas = parseNumber(cuotas);
  const tasaInteres = monthlyInterestRate(_monto, _cuotas);
  const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
  const ctc = (_cuotas * cuotaMensual)
  const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
  return{
    id: new Date().toISOString(),
    rut,
    renta,
    monto: _monto,
    cuotas: _cuotas,
    fechaPrimerPago,
    tasaInteres: (tasaInteres*100),
    cuotaMensual,
    ctc,
    cae: +cae.toFixed(2)
  }
}

app.post('/history/save', (req, res) => {
  try{
    const {rut, renta, monto, cuotas, fechaPrimerPago} = req.body;
    const snap = buildSimulationSnapshot({rut, renta, monto, cuotas, fechaPrimerPago});
    if(req.session.simulations.length >= 5) req.session.simulations.shift();
    req.session.simulations.push(snap);
    res.render('sim-results', {
      style: 'sim-results.css',
      js: 'sim-results.js',
      title: 'Resultados Simulación',
      rut,
      renta,
      monto: snap.monto,
      cuotas: snap.cuotas,
      tasaInteres: snap.tasaInteres,
      cuotaMensual: snap.cuotaMensual,
      ctc: snap.ctc,
      cae: snap.cae,
      fechaPrimerPago: snap.fechaPrimerPago,
      simulations: req.session.simulations
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e?.message || 'bad request' });
  }
})

app.post('/history', (req, res) =>{
  req.session.simulations = [];
  const {rut, renta, monto, cuotas, fechaPrimerPago} = req.body;
  res.render('simulator', {
      style: 'simulator.css', 
      title: 'Simulador Crédito de Consumo', 
      js: 'simulator.js'
    });
})

app.post('/history/load', (req, res) => {
  const { id } = req.body;
  const sim = req.session.simulations.find(s => s.id === id);
  if (!sim) return res.status(404).send('Not found');
  return res.render('sim-results', {
    style: 'sim-results.css',
    js: 'sim-results.js',
    title: 'Resultados Simulación',
    monto: sim.monto,
    cuotas: sim.cuotas,
    tasaInteres: sim.tasaInteres,
    cuotaMensual: sim.cuotaMensual,
    ctc: sim.ctc,
    cae: sim.cae,
    fechaPrimerPago: sim.fechaPrimerPago,
    simulations: req.session.simulations
  });
});

app.post('/recalculate', (req, res) => {
  const {rut, renta, monto, cuotas} = req.body;
  const _monto = parseNumber(monto);
  const _cuotas = parseNumber(cuotas);
  const _renta = parseNumber(renta);
  var tasaInteres = monthlyInterestRate(_monto, _cuotas);
  const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
  const ctc = (_cuotas*cuotaMensual);
  const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
  const fechaPrimerPago = req.session.lastInputs?.fechaPrimerPago;

  res.render('sim-results', { 
    style: 'sim-results.css', 
    js: 'sim-results.js', 
    title: 'Resultados Simulación',
    rut,
    renta: _renta, 
    monto: _monto, 
    cuotas: _cuotas, 
    tasaInteres: (tasaInteres*100), 
    cuotaMensual, 
    ctc, 
    cae: +cae.toFixed(2), 
    fechaPrimerPago,
    simulations: req.session.simulations});
})

app.post('/simulation', (req, res) => {
  const { rut, monto, renta, cuotas, fechaPrimerPago } = req.body;;
  const _monto = parseNumber(monto);
  const _cuotas = parseNumber(cuotas);
  const _renta = parseNumber(renta);
  var tasaInteres = monthlyInterestRate(_monto, _cuotas);
  const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
  const ctc = (_cuotas*cuotaMensual);
  const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
  
  req.session.lastInputs = {rut, monto, renta, cuotas, fechaPrimerPago}
  res.render('sim-results', { 
    style: 'sim-results.css', 
    js: 'sim-results.js', 
    title: 'Resultados Simulación', 
    rut,
    renta: _renta,
    monto: _monto, 
    cuotas: _cuotas, 
    tasaInteres: (tasaInteres*100),
    cuotaMensual, 
    ctc, 
    cae: +cae.toFixed(2), 
    fechaPrimerPago,
    simulations: req.session.simulations
  });
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
- [x] boton de "solicitar crédito" aka hacer la solicitud podría borrar el historial guardado en la bdd por el cliente -> historial temporal
- [x] hacer bien cálculos de la simulación (sin costos adicionales, son todos cálculos puros)
- [x] css + js de sim-results
- [x] ajustar monto y/o cuotas y recalcular inmediatamente
- [x] guardar solicitudes (temporalemnte) límite de 5 slots para guardar simulaciones, si se quiere agregar más se tienen que sobreescribir guardadas
- [x] poder cargar previas solicitudes para hacer la solicitud
- [] migraciones de la bdd ?
*/

//Historia de Usuario Simulación

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/solicitud');
  res.render('login', {style: 'login.css', js: 'login.js', title: 'Iniciar Sesión'});
});


app.post('/login', async (req, res) => {
  try {
    const {rut, password} = req.body;
    const result = await pool.query('SELECT * FROM users WHERE rut = $1', [rut]);
    if (result.rows.length === 0) {
      return res.status(401).json({ok: false, error: 'Usuario no encontrado'});
    }
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ok: false, error: 'Contraseña incorrecta'});
    }
    req.session.user = { id: user.id, rut: user.rut, nombre: user.nombre };
    res.json({ ok: true, user: req.session.user });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/solicitud', requireAuth, (req, res) => {
  res.render('solicitud', { 
    style: 'solicitud.css', 
    js: 'solicitud.js',
    title: 'Solicitar Préstamo',
    user: req.session.user 
  });
});


app.post('/solicitud', requireAuth, async (req, res) => {
  try {
    const {
      monto, cuotas, renta, 
      fechaPrimerPago,
      tasaInteres,
      cuotaMensual, ctc, cae
    } = req.body;
    const userId = req.session.user.id;
    const rut = req.session.user.rut;
    const result = await pool.query(
      'INSERT INTO prestamo (user_id, rut, monto, cuotas, renta, fecha_primer_pago, tasa_interes, cuota_mensual, ctc, cae) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [ userId, 
        rut, 
        monto, 
        cuotas, 
        renta, 
        fechaPrimerPago, 
        tasaInteres, 
        cuotaMensual, 
        ctc, 
        cae
      ]
    );
    res.json({ ok: true, prestamo: result.rows[0]});
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

