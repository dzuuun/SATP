const { getLog } = require("./log.model");

module.exports = {
  getLog: (req, res) => {
    const draw = parseInt(req.body.draw) || 1;
    const start = parseInt(req.body.start) || 0;
    const length = parseInt(req.body.length) || 10;
    const search = req.body.search?.value || "";

    getLog(start, length, search, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      // Response in DataTables format
      res.json({
        draw,
        recordsTotal: result.totalRecords,
        recordsFiltered: result.totalFiltered,
        data: result.results
      });
    });
  },
};
