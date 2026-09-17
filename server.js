const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routing
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/accounting', require('./routes/accountingRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));

// App View Routing
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/index.html')));
app.get('/reception', (req, res) => res.sendFile(path.join(__dirname, 'views/reception/index.html')));
app.get('/doctor', (req, res) => res.sendFile(path.join(__dirname, 'views/doctor/index.html')));
app.get('/accounting', (req, res) => res.sendFile(path.join(__dirname, 'views/accounting/index.html')));

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 [Bastiyan HIS Enterprise v4.5.8] Active`);
    console.log(`📍 Web Host: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
