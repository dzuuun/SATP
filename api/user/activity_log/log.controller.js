const { getLog, getYears, getNewEntries } = require("./log.model");

function requestedYear(value) {
  const currentYear = new Date().getFullYear();
  const year = Number.parseInt(value, 10);
  return year >= 2000 && year <= currentYear + 1 ? year : currentYear;
}

module.exports = {
  getNewEntries: (req, res) => {
    const afterId = String(req.query.after_id || "");
    if (
      !/^\d{1,20}$/.test(afterId) ||
      BigInt(afterId) > 18446744073709551615n
    ) {
      return res
        .status(400)
        .json({ success: 0, message: "Invalid activity cursor." });
    }
    const search = String(req.query.search || "")
      .trim()
      .slice(0, 100);
    getNewEntries(
      afterId,
      search,
      requestedYear(req.query.year),
      (error, result) => {
        if (error)
          return res
            .status(500)
            .json({ success: 0, message: "Unable to check new activity." });
        res.setHeader("Cache-Control", "no-store");
        return res.json({ success: 1, data: result });
      },
    );
  },

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
    const year = requestedYear(req.body.year);

    getLog(start, length, search, year, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        draw,
        recordsTotal: result.totalRecords,
        recordsFiltered: result.totalFiltered,
        data: result.results,
        latest_id: result.latestId,
      });
    });
  },
};
