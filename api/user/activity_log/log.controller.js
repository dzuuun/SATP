const { getLog, getYears } = require("./log.model");

module.exports = {
  getYears: (req, res) => {
    getYears((error, results) => {
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: 1, data: results });
    });
  },

  getLog: (req, res) => {
    const draw = parseInt(req.body.draw) || 1;
    const start = Math.max(0, Number.parseInt(req.body.start, 10) || 0);
    const requestedLength = Number.parseInt(req.body.length, 10) || 15;
    const length = Math.min(100, Math.max(10, requestedLength));
    const search = String(req.body.search?.value || "")
      .trim()
      .slice(0, 100);
    const currentYear = new Date().getFullYear();
    const requestedYear = Number.parseInt(req.body.year, 10);
    const year =
      requestedYear >= 2000 && requestedYear <= currentYear + 1
        ? requestedYear
        : currentYear;

    getLog(start, length, search, year, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        draw,
        recordsTotal: result.totalRecords,
        recordsFiltered: result.totalFiltered,
        data: result.results,
      });
    });
  },
};
