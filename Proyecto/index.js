const express = require('express');
const PDFDocument = require('pdfkit');
const { engine } = require('express-handlebars');
const session = require('express-session')
const pool = require('./database/db'); // Importar la conexión
const { redirect } = require('express/lib/response');
const { user } = require('pg/lib/defaults.js');
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

app.post('/simulation', (req, res) => {
  const { rut, monto, renta, cuotas, fechaPrimerPago } = req.body;;
  const _monto = parseNumber(monto);
  const _cuotas = parseNumber(cuotas);
  const _renta = parseNumber(renta);
  var tasaInteres = monthlyInterestRate(_monto, _cuotas);
  const cuotaMensual = monthlyCuota(_monto, _cuotas, tasaInteres);
  const ctc = (_cuotas*cuotaMensual);
  const cae = simulateCAE(_monto, cuotaMensual, _cuotas);
  const creditScore = calculateLoanScore(cuotaMensual, _renta, _monto, _cuotas);
  
  req.session.lastInputs = {rut, monto, renta, cuotas, fechaPrimerPago}
  res.render('sim-results', { 
    style: 'sim-results.css', 
    js: 'sim-results.js', 
    title: 'Resultados Simulación', 
    rut,
    user: req.session.user || null,
    renta: _renta,
    monto: _monto, 
    cuotas: _cuotas, 
    tasaInteres: (tasaInteres*100),
    cuotaMensual, 
    ctc, 
    cae: +cae.toFixed(2), 
    creditScore,
    fechaPrimerPago,
    simulations: req.session.simulations
  });
});


app.get('/simulator', (req, res) => {
  res.render('simulator', {style: 'simulator.css', title: 'Simulador Crédito de Consumo', js: 'simulator.js', user: req.session.user || null})
})

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`App corriendo en http://localhost:${port}`);
});



//Historia de Usuario Simulación

function requireAuth(req, res, next) {
  if (!req.session.user) {
  }
  next();
}

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/simulator');
  res.render('login', {
    style: 'simulator.css',
    js: 'login.js',
    title: 'Iniciar Sesión',
    error: null
  });
});


app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Crear Cuenta',
    style: 'register.css',  
    js: 'register.js',      
    error: null
  });
});


app.post('/register', async (req, res) => {
  try {
    const { rut, nombre, password } = req.body;
    const existingUser = await pool.query('SELECT * FROM users WHERE rut = $1', [rut]);
    if (existingUser.rows.length > 0) {
      return res.render('login', {
        style: 'simulator.css',
        js: 'login.js',
        title: 'Iniciar Sesión',
        error: 'El usuario ya existe'
      });
    }

    await pool.query(
      'INSERT INTO users (rut, nombre, password) VALUES ($1, $2, $3)',
      [rut, nombre, password]
    );
    res.redirect('/login');
  } catch (e) {
    res.render('login', {
      style: 'simulator.css',
      js: 'login.js',
      title: 'Iniciar Sesión',
      error: 'Error del servidor'
    });
  }
});


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


app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/solicitud', requireAuth, (req, res) => {
  if (!req.session.lastSimulation) {
    return res.redirect('/simulator');
  }
  const sim = req.session.lastSimulation;
  res.render('solicitud', { 
    style: 'solicitud.css', 
    js: 'solicitud.js',
    title: 'Solicitar Préstamo',
    user: req.session.user|| null,
    rut: sim.rut,
    monto: sim.monto,
    cuotas: sim.cuotas,
    renta: sim.renta,
    fechaPrimerPago: sim.fechaPrimerPago,
    tasaInteres: sim.tasaInteres,
    cuotaMensual: sim.cuotaMensual,
    ctc: sim.ctc,
    cae: sim.cae,
    creditScore: sim.creditScore
  });
});


app.post('/solicitud/prepare', requireAuth, (req, res) => {
  console.log('Datos recibidos en /solicitud/prepare:', req.body);
  req.session.lastSimulation = req.body;
  res.json({ ok: true });
});

app.post('/solicitud', requireAuth, async (req, res) => {
  try {
    console.log('Datos recibidos en POST /solicitud:', req.body);
    console.log('Usuario en sesión:', req.session.user);
    const {
      monto, cuotas, renta, 
      fechaPrimerPago,
      tasaInteres,
      cuotaMensual, 
      ctc, 
      cae
    } = req.body;
    const userId = req.session.user.id;
    const rut = req.session.user.rut;
    const result = await pool.query(
      'INSERT INTO prestamos (user_id, rut, monto, cuotas, renta, fecha_primer_pago, tasa_interes, cuota_mensual, ctc, cae) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
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

app.get('/contrato', async (req, res) => {
    try {
        const doc = new PDFDocument({
            size: 'A4',
            margins: {
                top: 72,
                bottom: 72,
                left: 72,
                right: 72
            }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=contrato.pdf');

        doc.pipe(res);
        doc.fontSize(20)
           .text('Contrato de Préstamo', { align: 'center' })
           .moveDown();
        doc.fontSize(12)
           .text('Este es un documento de prueba para generación de PDF.')
           .moveDown();
        doc.fontSize(16)
           .text('Datos del Préstamo')
           .moveDown(0.5);
        doc.fontSize(12)
           .text(`Fecha: ${new Date().toLocaleDateString()}`)
           .text(`Monto: $${req.session.lastSimulation?.monto || 'N/A'}`)
           .text(`Cuotas: ${req.session.lastSimulation?.cuotas || 'N/A'}`)
           .moveDown();
        doc.fontSize(16)
           .text('Términos y Condiciones')
           .moveDown(0.5);
        doc.fontSize(12)
           .text('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', {
               align: 'justify'
           })
           .moveDown(2);
        doc.moveDown(3)
           .text('____________________________', { align: 'center' })
           .text('Firma del Cliente', { align: 'center' });

        doc.end();
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error al generar el PDF');
    }
});

//HU6 Gestión de deuda !

app.get('/debts', (req, res) => {
  res.render('debts', {
    style: 'debts.css',
    title: 'Gestión de Deuda'

  });
});
app.get('/res-debt-rut', (req, res) => {
  res.render('debts', {
    style: 'res-debt-rut.css',
    mensaje: "Aquí saldrán los datos del usuario jeje"
  });
});

// HU3 Registro de Pago
app.get('/payment', (req, res) => {
  res.render('payment', {
    style: 'payment.css',
    js: 'payment.js',
    title: 'Pago de cuotas'
  });
});

app.get('/desembolso', async (req, res) => {
  try {
    const prestamos = await pool.query("SELECT id, rut, monto, estado, user_id FROM prestamos WHERE estado IN ('VIGENTE', 'APROBADO', 'FIRMADO')");
    res.render('desembolso', {
      style: 'desembolso.css',
      title: 'Desembolso de Préstamo',
      prestamosAprobados: prestamos.rows
    });
  } catch (e) {
    res.status(500).send('Error al cargar desembolso');
  }
});


app.post('/desembolso/ordenar', async (req, res) => {
  const { prestamoId } = req.body;
  try {
    await pool.query(
      "UPDATE prestamos SET estado = 'VIGENTE' WHERE id = $1",
      [prestamoId]
    );
    res.redirect('/desembolso');
  } catch (e) {
    res.status(500).send('Error al ordenar desembolso');
  }
});