const pool = require("../../../db/db");

const COUNT_CACHE_TTL = 30_000;
const SEARCH_CACHE_TTL = 15_000;
const YEAR_CACHE_TTL = 300_000;
const countCache = new Map();
const filteredCountCache = new Map();
let yearsCache = { value: [], expiresAt: 0 };

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (error, results) => {
      if (error) reject(error);
      else resolve(results);
    });
  });
}

function yearRange(year) {
  return [`${year}-01-01 00:00:00`, `${year + 1}-01-01 00:00:00`];
}

async function getYearTotal(year) {
  const now = Date.now();
  const cached = countCache.get(year);
  if (cached?.expiresAt > now) return cached.value;
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM activity_log
     WHERE date_time >= ? AND date_time < ?`,
    yearRange(year),
  );
  const value = Number(rows[0].total);
  countCache.set(year, { value, expiresAt: now + COUNT_CACHE_TTL });
  return value;
}

async function getFilteredCount(filter, params, cacheKey) {
  const now = Date.now();
  const cached = filteredCountCache.get(cacheKey);
  if (cached?.expiresAt > now) return cached.value;
  const rows = await query(
    `SELECT COUNT(*) AS total
     FROM activity_log AS a
     INNER JOIN user_info AS u ON u.user_id = a.user_id
     ${filter}`,
    params,
  );
  const value = Number(rows[0].total);
  filteredCountCache.set(cacheKey, {
    value,
    expiresAt: now + SEARCH_CACHE_TTL,
  });
  if (filteredCountCache.size > 100) {
    filteredCountCache.delete(filteredCountCache.keys().next().value);
  }
  return value;
}

module.exports = {
  getYears: async (callBack) => {
    try {
      const now = Date.now();
      if (yearsCache.expiresAt > now) return callBack(null, yearsCache.value);
      const rows = await query(
        `SELECT YEAR(date_time) AS year, COUNT(*) AS total
         FROM activity_log
         GROUP BY YEAR(date_time)
         ORDER BY year DESC`,
      );
      yearsCache = { value: rows, expiresAt: now + YEAR_CACHE_TTL };
      return callBack(null, rows);
    } catch (error) {
      return callBack(error);
    }
  },

  getLog: async (start, length, search, year, callBack) => {
    try {
      const normalizedSearch = String(search || "").trim();
      const params = yearRange(year);
      let filter = "WHERE a.date_time >= ? AND a.date_time < ?";

      if (normalizedSearch) {
        filter += `
          AND (
            CONCAT_WS(' ', u.givenname, u.surname) LIKE ?
            OR a.action LIKE ?
          )
        `;
        const pattern = `%${normalizedSearch}%`;
        params.push(pattern, pattern);
      }

      const dataQuery = `
        SELECT
          a.id,
          DATE_FORMAT(a.date_time, '%M %d, %Y %r') AS date_time,
          CONCAT_WS(' ', u.givenname, u.surname) AS name,
          a.action
        FROM activity_log AS a
        STRAIGHT_JOIN user_info AS u ON u.user_id = a.user_id
        ${filter}
        ORDER BY a.id DESC
        LIMIT ?, ?
      `;

      const totalPromise = getYearTotal(year);
      const filteredPromise = normalizedSearch
        ? getFilteredCount(
            filter,
            params,
            `${year}:${normalizedSearch.toLowerCase()}`,
          )
        : totalPromise;
      const dataPromise = query(dataQuery, [...params, start, length]);
      const [totalRecords, totalFiltered, results] = await Promise.all([
        totalPromise,
        filteredPromise,
        dataPromise,
      ]);

      return callBack(null, { totalRecords, totalFiltered, results });
    } catch (error) {
      return callBack(error);
    }
  },
};
