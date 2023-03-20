const {
    createUser,
    getUserByUserId,
    getUsers,
    getUserByUserName,
  } = require("./users.model");
 // const { genSaltSync, hashSync, compareSync } = require("bcrypt");
  
  module.exports = {
    createUser: (req, res) => {
      const body = req.body;
      const salt = genSaltSync(10);
      body.password = hashSync(body.password, salt);
      createUser(body, (err, results) => {
        if (err) {
          return res.status(500).json({
            success: 0,
            message:
              "Username already exists. Try again using a different username.",
          });
        }
        return res.json({
          success: 1,
          message: "User added successfully.",
          data: results,
        });
      });
    },
  
    getUserByUserId: (req, res) => {
      const id = req.params.id;
      getUserByUserId(id, (err, results) => {
        if (err) {
          console.log(err);
          return;
        }
        if (!results) {
          return res.status(500).json({
            success: 0,
            message: "Record not found.",
          });
        }
        return res.json({
          success: 1,
          message: "User information retrieved successfully.",
          data: results,
        });
      });
    },
  
    getUsers: (req, res) => {
      getUsers((err, results) => {
        if (err) {
          console.log(err);
          return;
        }
        if (!results) {
          return res.status(500).json({
            success: 0,
            message: "Record not found.",
          });
        }
        return res.json({
          success: 1,
          message: "Users information retrieved successfully.",
          count: results.length,
          data: results,
        });
      });
    },
  
    login: (req, res) => {
      const body = req.body;
      getUserByUserName(body.username, (err, results) => {
        if (err) {
          console.log(err);
        }
        if (!results) {
          return res.status(500).json({
            success: 0,
            message: "Invalid username or password.",
          });
        }
        const result = compareSync(body.password, results.password);
        if (result) {
          results.password = undefined;
          // const jsontoken = sign({ result: results }, process.env.SECRET_KEY, {
          //   expiresIn: "4h",
          // });
          return res.json({
            success: 1,
            message: "User logged in successfully."
          });
        } else {
          return res.status(500).json({
            success: 0,
            message: "Invalid username or password.",
          });
        }
      });
    },
  };