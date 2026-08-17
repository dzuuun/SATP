require("dotenv").config();
const { createPool } = require("mysql2");

const requiredDatabaseVariables = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];
const missingDatabaseVariables = requiredDatabaseVariables.filter(
  (name) => !String(process.env[name] || "").trim(),
);

if (missingDatabaseVariables.length) {
  throw new Error(
    `Missing database configuration: ${missingDatabaseVariables.join(", ")}`,
  );
}

const pool = createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

module.exports = pool;
