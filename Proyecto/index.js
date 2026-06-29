const express = require('express');
const PDFDocument = require('pdfkit');
const { engine } = require('express-handlebars');
const session = require('express-session');
const pool = require('./database/db');
const { redirect } = require('express/lib/response');
const { user } = require('pg/lib/defaults.js');
const multer = require('multer');
const app = express();
const port = 3000;


app.disable('x-powered-by');

//------------------------HANDLEBARS-SET-UP------------------------ 

app.engine('handlebars', engine({
  extname: 'handlebars',
  defaultLayout: 'main',
  layoutsDir: './views/layouts/'
}));

app.set('view engine', 'handlebars');
app.set('views', './views');


app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'default_dev_secret_replace_in_prod', 
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 30 } 
}));

app.use((req, res, next) => {
  if(!req.session.simulations) req.session.simulations = [];
  next();
});

app.post('/session/pending-sim', (req, res) => {
  req.session.pendingSimulation = req.body;
  req.session.save((err) => {
    if (err) return res.status(500).json({ ok: false });
  });
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});

//------------------------HELPER-FUNCTIONS------------------------

function parseNumber(str){
  if (typeof str !== 'string') return Number.NaN;
  let s = str.trim();
  s = s.replaceAll('.', '');
  s = s.replaceAll(',', '');
  const n = Number.parseFloat(s);
  return Number.isNaN(n) ? Number.NaN : n;
}


function monthlyInterestRate(monto, cuotas) {
  const isShortTerm = cuotas >= 6 && cuotas <= 35;

  // Tabla de rangos y tasas (ordenada de menor a mayor monto)
  const rates = [
    { max: 2999999, short: 0.0219, long: 0.0217 },
    { max: 6999999, short: 0.0155, long: 0.0153 },
    { max: 11999999, short: 0.0134, long: 0.0132 },
    { max: 22999999, short: 0.0112, long: 0.011 },
    { max: 30999999, short: 0.0107, long: 0.0105 }
  ];

  // Encontramos el primer rango en el que el monto encaje
  const tier = rates.find(r => monto <= r.max);

  // Si encontró un rango, retorna la tasa correspondiente; si no (monto mayor a 30,999,999), retorna la tasa por defecto
  if (tier) {
    return isShortTerm ? tier.short : tier.long;
  }
  
  return isShortTerm ? 0.0101 : 0.0099;
}

function monthlyCuota(monto, cuotas, tasaInteres){
  const numer = tasaInteres * (Math.pow((1 + tasaInteres), cuotas));
  const denom = Math.pow((1 + tasaInteres), cuotas) - 1;
  const cuota = monto * (numer / denom);
  return Math.round(cuota);
}

function monthlyIrr(cashFlow, guess = 0.01){
    let rate = guess;
    for(let i = 0; i < 100; i++){
        let f = 0;
        let df = 0;
        for(let t = 0; t < cashFlow.length; t++){
            const denom = Math.pow(1 + rate, t);
            f += cashFlow[t] / denom;
            df -= t * cashFlow[t] / (denom * (1 + rate));
        }
        const newRate = rate - f / df;
        if(Math.abs(newRate - rate) < 1e-10) break;
        rate = newRate;
    }
    return rate;
}

function simulateCAE(monto, cuotaMensual, cuotas){
    const cashFlow = [monto, ...new Array(cuotas).fill(-cuotaMensual)];
    const monthlyR = monthlyIrr(cashFlow);
    const cae = Math.pow(1 + monthlyR, 12) - 1;
    return cae * 100;
}

function calculateLoanScore(monthlyFee, monthlyIncome, totalLoanAmount, duration) {
    let score = 100;
    if(monthlyFee >= monthlyIncome) score -= 100;
    
    const debtToIncome = (monthlyFee / monthlyIncome) * 100;
    if (debtToIncome > 50) score -= 30;
    else if (debtToIncome > 40) score -= 20;
    else if (debtToIncome > 30) score -= 10;
    else if (debtToIncome > 20) score -= 5;
    
    const loanToAnnualIncome = totalLoanAmount / (monthlyIncome * 12);
    if (loanToAnnualIncome > 10) score -= 25;
    else if (loanToAnnualIncome > 5) score -= 15;
    else if (loanToAnnualIncome > 3) score -= 8;
    
    if (duration >= 60) score -= 10;
    else if (duration > 48) score -= 7;
    else if (duration > 36) score -= 3;
  
    return Math.max(0, Math.min(100, Math.round(score)));
}

function buildSimulationSnapshot({rut, renta, monto, cuotas, fechaPrimerPago}){
    const _monto = parseNumber(monto);
    const _cuotas = parseNumber(cuotas);
    const _renta = parseNumber(renta);
    const tasaInteres = monthlyInterestRate(_monto, _cuotas);
    const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
    const ctc = (_cuotas * cuotaMensual);
    const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
    const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
    
    return {
        id: new Date().toISOString(),
        rut,
        renta,
        monto: _monto,
        cuotas: _cuotas,
        fechaPrimerPago,
        tasaInteres: (tasaInteres * 100),
        cuotaMensual,
        ctc,
        cae: +cae.toFixed(2),
        creditScore
    };
}

//------------------------LOGIN------------------------

app.get('/', (req, res) => {
    if (req.session.user && !!req.session.pendingSimulation) return res.redirect('/simulator');
    res.render('login', {
        style: 'login.css',
        js: 'login.js',
        title: 'Iniciar Sesión',
        error: null
    });
});

app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/simulator');
    res.render('login', {
        style: 'login.css',
        js: 'login.js',
        title: 'Iniciar Sesión',
        error: null
    });
});

app.post('/login', async (req, res) => { 
    let { rut, password } = req.body;
    const rutLimpio = rut.replaceAll('.', '').trim();
    
    const result = await pool.query('SELECT * FROM users WHERE rut = $1', [rutLimpio]);
    const user = result.rows[0];
    if (!user || user.password !== password) {
        return res.render('login', {
            style: 'login.css',
            js: 'login.js',
            title: 'Iniciar Sesión',
            error: 'RUT o contraseña incorrectos.'
        });
    }
    req.session.user = { rut: user.rut };
    if (req.session.pendingSimulation) {
        return res.redirect('/sim-results/restore');
    }
    return res.redirect('/simulator');
});

//------------------------REGISTRO------------------------ 

app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Crear Cuenta',
        error: null
    });
});

app.post('/register', async (req, res) => {
    let { nombre, rut, password } = req.body;
    const rutLimpio = rut.replaceAll('.', '').trim();
    const email = `${rutLimpio}@example.cl`;

    try {
        await pool.query(
            'INSERT INTO users (rut, password, nombre, email) VALUES ($1, $2, $3, $4)',
            [rutLimpio, password, nombre, email]
        );


        console.log(`Nuevo usuario registrado con éxito en la base de datos.`);
        res.redirect('/login');
    } catch (err) {
        console.error("Error en el registro:", err.message);

        res.render('register', {
            title: 'Crear Cuenta',
            error: 'El RUT ya está registrado en nuestro sistema.'
        });
    }
});

//------------------------SIM-RESULTS------------------------

app.post('/history/save', (req, res) => {
  try {
    const {rut, renta, monto, cuotas, fechaPrimerPago} = req.body;
    const snap = buildSimulationSnapshot({rut, renta, monto, cuotas, fechaPrimerPago});
    if(req.session.simulations.length >= 5) req.session.simulations.shift();
    req.session.simulations.push(snap);
    res.render('sim-results', {
      style: 'sim-results.css',
      js: 'sim-results.js',
      title: 'Resultados Simulación',
      user: req.session.user || null,
      rut,
      renta,
      monto: snap.monto,
      cuotas: snap.cuotas,
      tasaInteres: snap.tasaInteres,
      cuotaMensual: snap.cuotaMensual,
      ctc: snap.ctc,
      cae: snap.cae,
      creditScore: snap.creditScore,
      fechaPrimerPago: snap.fechaPrimerPago,
      simulations: req.session.simulations
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e?.message || 'bad request' });
  }
});


app.post('/history', (req, res) => {
  req.session.simulations = [];
  res.render('simulator', {
      style: 'simulator.css', 
      title: 'Simulador Crédito de Consumo', 
      js: 'simulator.js',
      user: req.session.user || null
    });
});


app.post('/history/load', (req, res) => {
  const { id } = req.body;
  const sim = req.session.simulations.find(s => s.id === id);
  if (!sim) return res.status(404).send('Not found');
  return res.render('sim-results', {
    style: 'sim-results.css',
    js: 'sim-results.js',
    title: 'Resultados Simulación',
    user: req.session.user || null,
    rut: sim.rut,
    renta: sim.renta,
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
    let tasaInteres = monthlyInterestRate(_monto, _cuotas);
    const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
    const ctc = (_cuotas * cuotaMensual);
    const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
    const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
    const fechaPrimerPago = req.session.lastInputs?.fechaPrimerPago;

    if(creditScore >= 50){
            req.session.lastInputs = { rut, monto: _monto, renta: _renta, cuotas: _cuotas, fechaPrimerPago };

            res.render('sim-results', { 
            style: 'sim-results.css', 
            js: 'sim-results.js', 
            title: 'Resultados Simulación', 
            user: req.session.user || null,
            rut,
            renta: _renta, 
            monto: _monto, 
            cuotas: _cuotas, 
            tasaInteres: (tasaInteres * 100), 
            cuotaMensual, 
            ctc, 
            cae: +cae.toFixed(2),
            creditScore,
            fechaPrimerPago,
            simulations: req.session.simulations});
        } else {
            tasaInteres = monthlyInterestRate(req.session.lastInputs.monto, req.session.lastInputs.cuotas);
            const lastMonthlyFee  = monthlyCuota(req.session.lastInputs.monto, req.session.lastInputs.cuotas, tasaInteres);
            const lastctc = (req.session.lastInputs.cuotas * lastMonthlyFee);
            const lastcae = simulateCAE(req.session.lastInputs.monto, lastMonthlyFee, req.session.lastInputs.cuotas);
            res.render('sim-results', { 
                style: 'sim-results.css', 
                js: 'sim-results.js', 
                title: 'Resultados Simulación', 
                user: req.session.user || null,
                rut, 
                renta: req.session.lastInputs.renta,
                monto: req.session.lastInputs.monto,
                cuotas: req.session.lastInputs.cuotas,
                tasaInteres: tasaInteres,
                cuotaMensual: lastMonthlyFee,
                ctc: lastctc,
                cae: lastcae,
                fechaPrimerPago: req.session.lastInputs.fechaPrimerPago,
                rejected: true,
                error: '¡Lo sentimos! La puntuación de la simulación no es suficiente para ser aprobada como una solicitud real.',
                simulations: req.session.simulations
            });
        }
  });

app.get('/sim-results/restore', (req, res) => {
    const sim = req.session.pendingSimulation;
    if (!sim) return res.redirect('/simulator');
    
    delete req.session.pendingSimulation;
    const snap = buildSimulationSnapshot(sim);
    res.render('sim-results', {
        style: 'sim-results.css',
        js: 'sim-results.js',
        title: 'Resultados Simulación',
        user: req.session.user,
        rut: snap.rut,
        renta: snap.renta,
        monto: snap.monto,
        cuotas: snap.cuotas,
        tasaInteres: snap.tasaInteres,
        cuotaMensual: snap.cuotaMensual,
        ctc: snap.ctc,
        cae: snap.cae,
        creditScore: snap.creditScore,
        fechaPrimerPago: snap.fechaPrimerPago,
        simulations: req.session.simulations
    });
});

//------------------------SIMULATOR------------------------

app.get('/simulator', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');

    const client = await pool.connect();
    try {
        const rut = req.session.user.rut;
        const result = await client.query(
            'SELECT sueldo_declarado FROM antecedentes WHERE rut_usuario = $1 ORDER BY fecha_ingreso DESC LIMIT 1', 
            [rut]
        );

        if (result.rows.length === 0) {
            return res.redirect('/creditinfo');
        }

        const sueldo = Number.parseInt(result.rows[0].sueldo_declarado);
        
        const sugerido = {
            monto: sueldo * 4,
            cuotas: Math.round((sueldo * 4) / (0.2 * sueldo)),
            renta: sueldo
        };

        res.render('simulator', {
            style: 'simulator.css',
            js: 'simulator.js',
            title: 'Simulador Crédito de Consumo',
            user: req.session.user,
            rejected: false,
            error: "",
            sugerido: sugerido
        });

    } catch (err) {
        console.error("Error en el simulador:", err);
        res.status(500).send("Error interno del servidor");
    } finally {
        client.release();
    }
});


app.post('/simulation', async (req, res) => {
    const { rut, monto, cuotas, fechaPrimerPago } = req.body;
    
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT sueldo_declarado FROM antecedentes WHERE rut_usuario = $1 ORDER BY fecha_ingreso DESC LIMIT 1',
            [req.session.user.rut]
        );

        if (result.rows.length === 0) return res.redirect('/creditinfo');

        const _renta = Number.parseInt(result.rows[0].sueldo_declarado);
        const _monto = parseNumber(monto);
        const _cuotas = parseNumber(cuotas);

        const tasaInteres = monthlyInterestRate(_monto, _cuotas);
        const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
        const ctc = (_cuotas * cuotaMensual);
        const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
        const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
        
        if(creditScore >= 50){
            req.session.lastInputs = { rut, monto: _monto, renta: _renta, cuotas: _cuotas, fechaPrimerPago };

            res.render('sim-results', { 
                style: 'sim-results.css', 
                js: 'sim-results.js', 
                title: 'Resultados Simulación', 
                rut: req.session.user.rut,
                user: req.session.user,
                renta: _renta,
                monto: _monto, 
                cuotas: _cuotas, 
                tasaInteres: (tasaInteres * 100),
                cuotaMensual, 
                ctc, 
                cae: +cae.toFixed(2), 
                creditScore,
                fechaPrimerPago,
                simulations: req.session.simulations
            });
        } else {
            res.render('simulator', { 
                style: 'simulator.css', 
                js: 'simulator.js', 
                title: 'Simulador Crédito de Consumo', 
                user: req.session.user,
                rejected: true,
                error: '¡Lo sentimos! La puntuación de la simulación no es suficiente para ser aprobada como una solicitud real.',
                simulations: req.session.simulations
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send("Error al procesar la simulación");
    } finally {
        client.release();
    }
});

//------------------------CREDIT-INFO------------------------

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const rut = req.session.user.rut.replaceAll('.', '').replaceAll('-', '');
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        cb(null, `${rut}-${file.fieldname}-${timestamp}.${extension}`);
    }
});


const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB por archivo
});


app.get('/creditinfo', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    
    res.render('creditinfo', {
        title: 'Información Crediticia',
        style: 'creditinfo.css',
        js: 'creditinfo.js',
        user: req.session.user
    });
});

app.post('/creditinfo', upload.fields([
    { name: 'liquidacion', maxCount: 1 },
    { name: 'cotizaciones', maxCount: 1 }, 
    { name: 'carnet', maxCount: 1 }       
]), async (req, res) => {
    const client = await pool.connect(); 

    try {

        if (!req.files?.['liquidacion'] || !req.files?.['cotizaciones'] || !req.files?.['carnet']) {
            throw new Error('Debes subir los tres documentos solicitados.');
        }

        const { sueldo, antiguedad, deudas } = req.body;
        const rut = req.session.user.rut.replaceAll('.', '');

        await client.query('BEGIN');

        const idsDocs = {};

        for (const fieldName in req.files) {
            const file = req.files[fieldName][0];
            const resDoc = await client.query(`
                INSERT INTO documento (rut_usuario, tipo_documento, nombre_original, nombre_sistema, ruta_archivo)
                VALUES ($1, $2, $3, $4, $5) RETURNING id_documento
            `, [rut, fieldName, file.originalname, file.filename, file.path]);
            
            idsDocs[fieldName] = resDoc.rows[0].id_documento;
        }

        const sueldoLimpio = String(sueldo || "0").replaceAll(/\D/g, "");
        const deudasLimpias = String(deudas || "0").replaceAll(/\D/g, "");
        const antiguedadLimpia = Number.parseInt(antiguedad) || 0;

        const queryAntecedentes = `
            INSERT INTO antecedentes 
            (rut_usuario, sueldo_declarado, antiguedad_laboral, deudas_totales, id_doc_liquidacion, id_doc_cotizaciones, id_doc_carnet)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const valuesAntecedentes = [
            rut,
            Number.parseInt(sueldoLimpio),
            antiguedadLimpia,
            Number.parseInt(deudasLimpias),
            idsDocs['liquidacion'],
            idsDocs['cotizaciones'],
            idsDocs['carnet']
        ];

        await client.query(queryAntecedentes, valuesAntecedentes);
        await client.query('COMMIT');

        res.redirect('/simulator');

    } catch (err) {

        try { await client.query('ROLLBACK'); } catch (e) { console.error("Error en rollback:", e.message); }
        console.error("Error en creditinfo:", err);
        res.render('creditinfo', {
            style: 'creditinfo.css',
            js: 'creditinfo.js',
            title: 'Información Crediticia',
            user: req.session.user || null,
            error: err.message || 'Hubo un error al procesar la información.'
        });
    } finally {
        client.release();
    }
});