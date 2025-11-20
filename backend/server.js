const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());

const pool = new Pool({
  user: 'adrian',
  host: 'localhost',
  database: 'taxi_data',
  password: '1234',
  port: 5432,
});

// --- MOTOR DE FILTROS (BLINDADO) ---
const buildWhereClause = (dayFilter, timeOfDay, monthFilter) => {
  let conditions = [];

  // Filtro de Día
  if (dayFilter === 'weekend') conditions.push("EXTRACT(DOW FROM tpep_pickup_datetime) IN (0, 6)");
  else if (dayFilter === 'weekday') conditions.push("EXTRACT(DOW FROM tpep_pickup_datetime) IN (1, 2, 3, 4, 5)");
  else if (dayFilter !== 'all' && dayFilter !== undefined) conditions.push(`EXTRACT(DOW FROM tpep_pickup_datetime) = ${dayFilter}`);

  // Filtro de Hora
  if (timeOfDay === 'morning') conditions.push("EXTRACT(HOUR FROM tpep_pickup_datetime) BETWEEN 6 AND 11");
  else if (timeOfDay === 'afternoon') conditions.push("EXTRACT(HOUR FROM tpep_pickup_datetime) BETWEEN 12 AND 17");
  else if (timeOfDay === 'night') conditions.push("(EXTRACT(HOUR FROM tpep_pickup_datetime) >= 18 OR EXTRACT(HOUR FROM tpep_pickup_datetime) < 6)");

  // Filtro de Mes
  if (monthFilter !== 'all' && monthFilter !== undefined) conditions.push(`EXTRACT(MONTH FROM tpep_pickup_datetime) = ${monthFilter}`);

  return conditions; // Devuelve ARRAY, no string
};

// Helper para evitar errores de SQL (WHERE ... AND ...)
const getSqlWhere = (conditionsArray, extraCondition = null) => {
  let allConditions = [...conditionsArray];
  if (extraCondition) allConditions.push(extraCondition);
  
  if (allConditions.length > 0) return "WHERE " + allConditions.join(" AND ");
  return "";
};

// --- ENDPOINTS ---

// 1. KPIS GENERALES
app.get('/api/kpis', async (req, res) => {
  const { day, time, month } = req.query;
  const conditions = buildWhereClause(day, time, month);
  const where = getSqlWhere(conditions, "tpep_dropoff_datetime > tpep_pickup_datetime AND trip_distance > 0.1");
  
  try {
    const query = `
      SELECT 
        AVG(trip_distance) as avg_distance,
        AVG(total_amount) as avg_price,
        AVG(tip_amount) as avg_tip,
        AVG(fare_amount / NULLIF(trip_distance, 0)) as price_per_mile,
        AVG(trip_distance / NULLIF((EXTRACT(EPOCH FROM (tpep_dropoff_datetime - tpep_pickup_datetime))/3600), 0)) as avg_speed,
        COUNT(*) as total_trips
      FROM trips ${where}`;
    const result = await pool.query(query);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

// 2. PICO VS VALLE (CON SUMA PONDERADA)
app.get('/api/peak-valley', async (req, res) => {
  const { day, time, month } = req.query;
  const where = getSqlWhere(buildWhereClause(day, time, month), "trip_distance > 0");
  
  try {
    const query = `
      SELECT 
        CASE 
          WHEN EXTRACT(HOUR FROM tpep_pickup_datetime) IN (7,8,9,17,18,19) THEN 'Horas Pico' 
          ELSE 'Horas Valle' 
        END as period,
        AVG(trip_distance) as avg_distance,
        -- FÓRMULA CORRECTA: SUMA PONDERADA (Total Dinero / Total Millas)
        SUM(total_amount) / NULLIF(SUM(trip_distance), 0) as weighted_price_per_mile
      FROM trips ${where} 
      GROUP BY period`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

// 3. PREDICTOR
app.get('/api/predict', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "Faltan zonas" });
  try {
    const queryExact = `SELECT AVG(total_amount) as predicted_price, AVG(EXTRACT(EPOCH FROM (tpep_dropoff_datetime - tpep_pickup_datetime))/60) as duration_min, COUNT(*) as samples, 'Histórico Exacto' as type FROM trips WHERE "PULocationID" = $1 AND "DOLocationID" = $2 AND trip_distance > 0`;
    const resultExact = await pool.query(queryExact, [from, to]);
    if (parseInt(resultExact.rows[0].samples) > 0) return res.json(resultExact.rows[0]);
    
    const queryOrigin = `SELECT AVG(total_amount) as predicted_price, AVG(EXTRACT(EPOCH FROM (tpep_dropoff_datetime - tpep_pickup_datetime))/60) as duration_min, 0 as samples, 'Estimación por Zona' as type FROM trips WHERE "PULocationID" = $1 AND trip_distance > 0`;
    const resultOrigin = await pool.query(queryOrigin, [from]);
    if (resultOrigin.rows[0].predicted_price) return res.json(resultOrigin.rows[0]);
    
    const queryGlobal = `SELECT AVG(total_amount) as predicted_price, AVG(EXTRACT(EPOCH FROM (tpep_dropoff_datetime - tpep_pickup_datetime))/60) as duration_min, 0 as samples, 'Promedio Global' as type FROM trips WHERE trip_distance > 0`;
    const resultGlobal = await pool.query(queryGlobal);
    res.json(resultGlobal.rows[0]);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

// 4. OTROS ENDPOINTS (Hourly, Zones, Histogram, Top-Zones, Alert)
app.get('/api/hourly', async (req, res) => {
  const { day, time, month } = req.query;
  const where = getSqlWhere(buildWhereClause(day, time, month));
  try {
    const query = `SELECT EXTRACT(HOUR FROM tpep_pickup_datetime) as hour, COUNT(*) as count FROM trips ${where} GROUP BY hour ORDER BY hour`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

app.get('/api/zones', async (req, res) => {
  const { day, time, month } = req.query;
  const where = getSqlWhere(buildWhereClause(day, time, month));
  try {
    const query = `SELECT "PULocationID" as zone_id, COUNT(*) as trip_count FROM trips ${where} GROUP BY "PULocationID"`;
    const result = await pool.query(query);
    const zoneMap = {};
    result.rows.forEach(row => zoneMap[row.zone_id] = parseInt(row.trip_count));
    res.json(zoneMap);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

app.get('/api/histogram', async (req, res) => {
  const { day, time, month } = req.query;
  const conditions = buildWhereClause(day, time, month);
  const where = getSqlWhere(conditions, "total_amount BETWEEN 0 AND 100"); // FIX DOBLE WHERE
  try {
    const query = `SELECT FLOOR(total_amount / 10) * 10 as price_range, COUNT(*) as count FROM trips ${where} GROUP BY price_range ORDER BY price_range ASC`;
    const result = await pool.query(query);
    res.json(result.rows.map(r => ({ range: `$${r.price_range}-${r.price_range + 10}`, count: parseInt(r.count) })));
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

app.get('/api/top-zones', async (req, res) => {
  const { day, time, month } = req.query;
  const where = getSqlWhere(buildWhereClause(day, time, month));
  try {
    const query = `SELECT "PULocationID" as zone_id, COUNT(*) as count FROM trips ${where} GROUP BY zone_id ORDER BY count DESC LIMIT 5`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

app.get('/api/alert', async (req, res) => {
  const { day, time, month } = req.query;
  const where = getSqlWhere(buildWhereClause(day, time, month));
  try {
    const query = `SELECT EXTRACT(DOW FROM tpep_pickup_datetime) as day_num, EXTRACT(HOUR FROM tpep_pickup_datetime) as hour_num, COUNT(*) as total_trips FROM trips ${where} GROUP BY day_num, hour_num ORDER BY total_trips DESC LIMIT 1`;
    const result = await pool.query(query);
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).send('Error BD'); }
});

app.listen(port, () => { console.log(`📡 Backend PONDERADO y SEGURO listo en puerto ${port}`); });
