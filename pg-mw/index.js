const express = require('express');
const { Pool } = require('pg');
const { json } = require('body-parser');
const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');
const RconConnection = require('./rcon.js');


const rconConnection = new RconConnection();

const app = express();

app.use(json()); // Parse JSON request bodies
let matchData = {};
const ajv = new Ajv();
const schemaPath = path.join(__dirname, 'schema.json');
console.log('Schema path:', schemaPath);
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

// Hardcoded PostgreSQL connection details

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

app.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }

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

// POST  endpoint to store a match json and stores in the memory until the GET end point is called
app.post('/start-match', async (req, res) => {
  try {
    const match = req.body; // Get the match from the request body
    // check if the match is compliant with the JSON schema at schema.json
    console.log('Match:', match);
    const valid = validate(match);
    if (!valid) {
      return res.status(400).json({ error: 'Match is not compliant with the schema.', details: validate.errors });
    } 
    matchData = match;
    await rconConnection.startMatch();

    res.json({ message: 'Match stored successfully' });
  } catch (err) {
    console.error('Error parsing request body:', err);
    res.status(400).json({ error: 'Failed to parse request body.', details: err.message });
  }
});

// GET endpoint to retrieve the stored match json
app.get('/get-match', async (req, res) => {
  try {
    res.json(matchData);
    matchData = {};
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

