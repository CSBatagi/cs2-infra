const express = require('express');
const { Pool } = require('pg');
const { json } = require('body-parser');

const app = express();
app.use(json()); // Parse JSON request bodies

// Hardcoded PostgreSQL connection details

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.use((req, res, next) => {
  const apiKey = req.headers['authorization'];

  // Check if the Authorization header is present and starts with 'Bearer '
  if (!apiKey || !apiKey.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Extract the token after 'Bearer ' and compare it with the environment variable
  const token = apiKey.split(' ')[1];
  if (token !== process.env.AUTH_TOKEN) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
});

// POST endpoint to execute a query
app.post('/execute-query', async (req, res) => {
  try {
    const { query } = req.body; // Get the query from the request body

    if (!query) {
      return res.status(400).json({ error: 'Query is required in the request body.' });
    }

    try {
      const result = await pool.query(query);

      // Build the response structure
      const response = {
        columns: result.fields.map(field => field.name), // Extract column names
        rows: result.rows.map(row => Object.values(row)), // Convert row objects to arrays
      };

      res.json(response);
    } catch (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ error: 'Failed to execute query.', details: err.message });
    }
  } catch (err) {
    console.error('Error parsing request body:', err);
    res.status(400).json({ error: 'Failed to parse request body.', details: err.message });
  }
});



// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Middleware is running on port ${port}`);
});

