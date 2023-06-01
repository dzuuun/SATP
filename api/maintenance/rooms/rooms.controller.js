const {
  getRooms,
  getRoomById,
  addRoom,
  updateRoom,
  deleteRoom,
} = require("./rooms.model");

module.exports = {
  getRooms: (req, res) => {
    getRooms((err, results) => {
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
        message: "Rooms information retrieved successfully.",
        count: results.length,
        data: results,
      });
    });
  },

  getRoomById: (req, res) => {
    const id = req.params.id;
    getRoomById(id, (err, results) => {
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
        message: "Room information retrieved successfully.",
        data: results,
      });
    });
  },

  addRoom: (req, res) => {
    const body = req.body;
    addRoom(body, (err, results) => {
      if (err) {
        console.log(err);
        return res.json({
          success: 0,
          message: "Room already exists. Try again.",
        });
      }
      if (results === undefined) {
        return res.status(500).json({
          success: 0,
          message: "Some fields are missing or incorrect format.",
        });
      }
      return res.json({
        success: 1,
        message: "Room added successfully.",
        data: results,
      });
    });
  },

  updateRoom: (req, res) => {
    const body = req.body;
    updateRoom(body, (err, results) => {
      if (err) {
        console.log(err);
        return false;
      }
      if (results.changedRows == 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }
      return res.json({
        success: 1,
        message: "Room information updated successfully.",
      });
    });
  },

  deleteRoom: (req, res) => {
    const body = req.body;
    deleteRoom(body, (err, results) => {
      if (err) {
        console.log(err);
        return;
      }
      if (results.affectedRows == 0) {
        return res.json({
          success: 0,
          message: "No record found.",
        });
      }
      return res.json({
        success: 1,
        message: "Room deleted successfully.",
      });
    });
  },
};
