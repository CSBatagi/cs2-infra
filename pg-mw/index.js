import express from 'express';
import { Pool } from 'pg';
import { json } from 'body-parser';

const app = express();
app.use(json()); // Parse JSON request bodies

// Hardcoded PostgreSQL connection details

const pool = new Pool({
  user: process.env.DB_USER,
  host: "postgres",
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// POST endpoint to execute a query
app.post('/execute-query', async (req, res) => {
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
});

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'your_secret_api_key') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Middleware is running on port ${port}`);
});

