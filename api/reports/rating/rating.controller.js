const { getIndividualRating, getComment} = require("./rating.model");

module.exports = {
  getIndividualRating: (req, res) => {
    const body = req.body;
    getIndividualRating(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Overall ranking retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },
  getComment: (req, res) => {
    const body = req.body;
    getComment(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (!results) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Comments retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

}