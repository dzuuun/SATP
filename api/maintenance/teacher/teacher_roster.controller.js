const roster = require("./teacher_roster.service");

exports.preview = async (req, res) => {
  try {
    const result = await roster.preview(req.body.rows);
    return res.json({ success: 1, data: result });
  } catch (error) {
    return res.status(400).json({ success: 0, message: error.message });
  }
};

exports.run = async (req, res) => {
  try {
    const result = await roster.run(
      req.body.rows,
      req.body.preview_token,
      req.body.selected_teacher_ids,
      req.user.id,
    );
    return res.json({ success: 1, data: result });
  } catch (error) {
    console.error("Unable to synchronize College teacher roster:", error);
    return res.status(400).json({ success: 0, message: error.message });
  }
};
