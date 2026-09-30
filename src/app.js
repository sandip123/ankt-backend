require('dotenv').config();

const cors = require('cors');
const express = require('express');
const apiRoutes = require('./routes');

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Anatkrupa Society API is running'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number(error.status) || 500;
  const message = error.expose
    ? error.publicMessage
    : status === 500
      ? 'Server error'
      : error.publicMessage || error.message;

  res.status(status).json({
    success: false,
    message
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`ANKT backend listening on port ${port}`);
  });
}

module.exports = app;