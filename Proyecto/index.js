const express = require('express');
const PDFDocument = require('pdfkit');
const { engine } = require('express-handlebars');
const session = require('express-session')
const pool = require('./database/db');
const { redirect } = require('express/lib/response');
const { user } = require('pg/lib/defaults.js');
const app = express();
const port = 3000;


app.engine('handlebars', engine({
  extname: 'handlebars',
  defaultLayout: 'main',
  layoutsDir: './views/layouts/'
}));
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(session ({
  secret: 'supermegagigachadsecretuser',
  resave: false,
  saveUninitialized: true,
  cookie: {maxAge: 1000*60*30} //Sesión de 'Guest' dura 30 minutos
}));
app.use((req, res, next) => {
  if (!req.session.simulations) req.session.simulations = [];
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/session/pending-sim', (req, res) => {
    req.session.pendingSimulation = req.body;
    req.session.save((err) => {
        if (err) return res.status(500).json({ ok: false });
        res.json({ ok: true });
    });
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});

//------------------------HELPER-FUNCTIONS------------------------

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

function calculateLoanScore(monthlyFee, monthlyIncome, totalLoanAmount, duration) {
  /* Calcula score entre 0 a 100 basándose en el ratio de cuota/ingreso mensual,
  monto total/ingreso anual, y duración del préstamo. Falta tomar en cuenta el historial,
  pero como todavía no lo implementamos no se puede hacer mucho */
    let score = 100;
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
    else if (duration > 36) score -= 3; //créditos a menos de 36 meses no imponen penalización 
  
  /* !!!!!!!!!!!!Cuando esté implementado el historial de pagos, aquí hay que poner una 
  4ta condición para restarle. Esta debería ser la que más peso tenga, así que
  tendríamos que reajustar los números de las primeras 3 también. */
  
    return Math.max(0, Math.min(100, Math.round(score))); //para que sea un int
}

function buildSimulationSnapshot({rut, renta, monto, cuotas, fechaPrimerPago}){
    const _monto = parseNumber(monto);
    const _cuotas = parseNumber(cuotas);
    const _renta = parseNumber(renta);
    const tasaInteres = monthlyInterestRate(_monto, _cuotas);
    const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
    const ctc = (_cuotas * cuotaMensual)
    const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
    const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
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
        cae: +cae.toFixed(2),
        creditScore
    }
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

app.post('/login', async (req, res) => { //hecho muy a la rápida, posiblemente la cague pero está bien manejado el redirect para el caso que me importaba

    let { rut, password } = req.body;
    const rutLimpio = rut.replace(/\./g, '').trim();
    
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
    if (req.session.pendingSimulation) { //para cuando vuelvo del sim-results
        return res.redirect('/sim-results/restore');
    }
    return res.redirect('/simulator'); //para cuando estoy simplemente iniciando sesión desde cero
});

//------------------------REGISTRO------------------------ 

// RUTA GET: Muestra el formulario de registro al usuario
app.get('/register', (req, res) => {
    res.render('register', {
        title: 'Crear Cuenta',
        error: null
        // No pasamos "js" ni "style" porque ya los pusiste fijos en el HTML que me mostraste
    });
});

// RUTA POST: Recibe los datos del formulario y los guarda en Postgres
app.post('/register', async (req, res) => {
    // Extraemos los datos del formulario (req.body)

    let { nombre, rut, password } = req.body;

    const rutLimpio = rut.replace(/\./g, '').trim();
    
    // Como tu formulario actual no tiene campo "email", 
    // definimos uno por defecto para que la DB no de error si es NOT NULL.
    const email = `${rutLimpio}@example.cl`;

    try {
        await pool.query(
            'INSERT INTO users (rut, password, nombre, email) VALUES ($1, $2, $3, $4)',
            [rutLimpio, password, nombre, email]
        );

        console.log(`Usuario ${nombre} registrado con éxito.`);
        res.redirect('/login');
    } catch (err) {
        console.error("Error en el registro:", err.message);
        
        // Manejo de errores estilo Django: si el RUT ya existe
        res.render('register', {
            title: 'Crear Cuenta',
            error: 'El RUT ya está registrado en nuestro sistema.'
        });
    }
});
//------------------------SIM-RESULTS------------------------

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
})

app.post('/history', (req, res) =>{
  req.session.simulations = [];
  const {rut, renta, monto, cuotas, fechaPrimerPago} = req.body;
  res.render('simulator', {
      style: 'simulator.css', 
      title: 'Simulador Crédito de Consumo', 
      js: 'simulator.js',
      user: req.session.user || null
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
    var tasaInteres = monthlyInterestRate(_monto, _cuotas);
    const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
    const ctc = (_cuotas*cuotaMensual);
    const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
    const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
    const fechaPrimerPago = req.session.lastInputs?.fechaPrimerPago;


  
res.render('sim-results', { 
    style: 'sim-results.css', 
    js: 'sim-results.js', 
    title: 'Resultados Simulación',
    user: req.session.user || null,
    rut,
    renta: _renta, 
    monto: _monto, 
    cuotas: _cuotas, 
    tasaInteres: (tasaInteres*100), 
    cuotaMensual, 
    ctc, 
    cae: +cae.toFixed(2),
    creditScore,
    fechaPrimerPago,
    simulations: req.session.simulations});
})

app.get('/sim-results/restore', (req, res) => {
    const sim = req.session.pendingSimulation;
    if (!sim) return res.redirect('/simulator');
    delete req.session.pendingSimulation; //no funcionaba bien hasta que empecé a borrar esto, ni idea de por qué pero supongo que es importante hacerlo????
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
    // 1. Protección de ruta
    if (!req.session.user) return res.redirect('/login');

    const client = await pool.connect();
    try {
        const rut = req.session.user.rut;

        // 2. Buscar antecedentes del usuario (el más reciente)
        const result = await client.query(
            'SELECT sueldo_declarado FROM antecedentes WHERE rut_usuario = $1 ORDER BY fecha_ingreso DESC LIMIT 1', // <-- CAMBIADO AQUÍ
            [rut]
        );

        // 3. Si no tiene antecedentes, mandarlo a completar info
        if (result.rows.length === 0) {
            return res.redirect('/creditinfo');
        }

        // 4. Si tiene, preparamos la sugerencia
        const sueldo = parseInt(result.rows[0].sueldo_declarado);
        
        // Lógica: Sugerimos un crédito de 4 sueldos y 24 cuotas
        // EN BASE A SUELDO, ACA PONER PARAMETROS, CALCULOS O CUALQUIER COSA RELACIONADA AL SCORING
        const sugerido = {
            monto: sueldo * 4,
            cuotas: 24,
            renta: sueldo
        };

        res.render('simulator', {
            style: 'simulator.css',
            js: 'simulator.js',
            title: 'Simulador Crédito de Consumo',
            user: req.session.user,
            sugerido: sugerido // Pasamos el objeto a la vista
        });

    } catch (err) {
        console.error("Error en el simulador:", err);
        res.status(500).send("Error interno del servidor");
    } finally {
        client.release();
    }
});

app.post('/simulation', async (req, res) => {
    // 1. Extraemos los datos del body
    const { rut, monto, cuotas, fechaPrimerPago } = req.body;
    
    // 2. Seguridad: En lugar de confiar en 'renta' del body, 
    // la recuperamos de la base de datos o de la sesión si la guardaste ahí.
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT sueldo_declarado FROM antecedentes WHERE rut_usuario = $1 ORDER BY fecha_ingreso DESC LIMIT 1',
            [req.session.user.rut]
        );

        if (result.rows.length === 0) return res.redirect('/creditinfo');

        const _renta = parseInt(result.rows[0].sueldo_declarado);
        const _monto = parseNumber(monto);
        const _cuotas = parseNumber(cuotas);

        // 3. Cálculos financieros
        const tasaInteres = monthlyInterestRate(_monto, _cuotas);
        const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
        const ctc = (_cuotas * cuotaMensual);
        const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
        const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
        
        // 4. Guardar inputs para persistencia
        req.session.lastInputs = { rut, monto, renta: _renta, cuotas, fechaPrimerPago };

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

    } catch (err) {
        console.error(err);
        res.status(500).send("Error al procesar la simulación");
    } finally {
        client.release();
    }
});


//------------------------CREDIT INFO------------------------
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const rut = req.session.user.rut.replace(/\./g, '').replace(/-/g, '');
        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        // Resultado: 18555444k-carnet-1713387300.jpg
        cb(null, `${rut}-${file.fieldname}-${timestamp}.${extension}`);
    }
});

const upload = multer({ storage: storage });

// RUTA GET: Mostrar el formulario
app.get('/creditinfo', (req, res) => {
    // Verificamos si el usuario está logueado (como en Django login_required)
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
        if (!req.files || !req.files['liquidacion'] || !req.files['cotizaciones'] || !req.files['carnet']) {
            throw new Error('Debes subir los tres documentos solicitados.');
        }

        const { sueldo, antiguedad, deudas } = req.body;
        const rut = req.session.user.rut.replace(/\./g, ''); // Quita los puntos, deja el guion si existe

        await client.query('BEGIN');

        const idsDocs = {};

        // 1. Inserción de documentos (Mantiene tu lógica original)
        for (const fieldName in req.files) {
            const file = req.files[fieldName][0];
            const resDoc = await client.query(`
                INSERT INTO documento (rut_usuario, tipo_documento, nombre_original, nombre_sistema, ruta_archivo)
                VALUES ($1, $2, $3, $4, $5) RETURNING id_documento
            `, [rut, fieldName, file.originalname, file.filename, file.path]);
            
            idsDocs[fieldName] = resDoc.rows[0].id_documento;
        }

        // 2. Limpieza segura de datos (Sanitización)
        // Convertimos a String primero para evitar errores si llega un número puro
        const sueldoLimpio = String(sueldo || "0").replace(/\D/g, "");
        const deudasLimpias = String(deudas || "0").replace(/\D/g, "");
        const antiguedadLimpia = parseInt(antiguedad) || 0;

        // 3. Inserción en antecedentes
        const queryAntecedentes = `
            INSERT INTO antecedentes 
            (rut_usuario, sueldo_declarado, antiguedad_laboral, deudas_totales, id_doc_liquidacion, id_doc_cotizaciones, id_doc_carnet)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const valuesAntecedentes = [
            rut,
            parseInt(sueldoLimpio),
            antiguedadLimpia,
            parseInt(deudasLimpias),
            idsDocs['liquidacion'],
            idsDocs['cotizaciones'],
            idsDocs['carnet']
        ];

        await client.query(queryAntecedentes, valuesAntecedentes);
        await client.query('COMMIT');

        res.redirect('/simulator');

    } catch (err) {
        try { await client.query('ROLLBACK'); } catch (e) {}
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