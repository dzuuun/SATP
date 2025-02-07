const pool = require("../../../db/db");

module.exports = {
  getTeachers: (callback) => {
    pool.query(
      "SELECT teachers.id, CONCAT(teachers.givenname, ' ', teachers.surname) AS name, departments.code AS department_code, teachers.is_part_time, teachers.is_active  FROM teachers INNER JOIN departments on teachers.department_id=departments.id",
      (error, results) => {
        if (error) {
          callback(error);
        }
        return callback(null, results);
      }
    );
  },

  getActiveTeachers: (callback) => {
    pool.query(
      "SELECT teachers.id, CONCAT(teachers.surname, ', ', teachers.givenname) AS name, departments.code AS department_code, teachers.is_part_time, teachers.is_active  FROM teachers INNER JOIN departments on teachers.department_id=departments.id WHERE teachers.is_active = 1 ORDER BY name",
      (error, results) => {
        if (error) {
          callback(error);
        }
        return callback(null, results);
      }
    );
  },

  getTeacherById: (Id, callBack) => {
    pool.query(
      "SELECT  teachers.id, teachers.givenname, teachers.surname, teachers.middlename, departments.id AS department_id, teachers.is_part_time, teachers.is_active FROM teachers INNER JOIN departments on teachers.department_id=departments.id  WHERE teachers.id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  }, 

  getTeacherByName: (data, callBack) => {
    pool.query(
      "SELECT  teachers.id, teachers.givenname, teachers.surname, teachers.middlename, departments.id AS department_id, teachers.is_part_time, teachers.is_active FROM teachers INNER JOIN departments on teachers.department_id=departments.id  WHERE teachers.givenname LIKE ? AND teachers.surname LIKE ?",
      [data.givenname + '%', data.surname + '%'],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  getTeacherImageById: (Id, callBack) => {
    pool.query(
"SELECT path FROM image_file WHERE teacher_id=?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results[0]);
      }
    );
  },

  // uploadTeacherImage: (data, callBack) => {
  //   pool.query(
  //     "SELECT CONCAT( teachers.givenname, ' ', teachers.surname ) AS teacher_name FROM teachers WHERE id=?",
  //     [data.teacher_id],
  //     (error, results) => {
  //       console.log(results)
  //       if (results.length == 1) {
  //         pool.query(
  //           "INSERT INTO image_file(teacher_id, name, path) VALUES (?,?,?)",
  //           [
  //             data.teacher_id,
  //             data.name,
  //             data.path,
  //           ],
  //           (error, results) => {
  //             console.log(results)
  //             pool.query(
  //               "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
  //               [
  //                 data.user_id,
  //                 "Added Teacher's Image: " + results.teacher_name ,
  //               ],
  //               (error, results) => {
  //                 if (error) {
  //                   console.log(error);
  //                 }
  //               }
  //             );
  //             if (error) {
  //               callBack(error);
  //             }
  //             return callBack(null, results);
  //           }
  //         );
  //       } else {
  //         return callBack(results);
  //       }
  //     }
  //   );
  // },

  uploadTeacherImage: (data, callBack) => {
    pool.query(
      "SELECT CONCAT(givenname, ' ', surname) AS teacher_name FROM teachers WHERE id = ?",
      [data.teacher_id],
      (error, results) => {
        if (error) {
          console.log(error);
          return callBack(error);
        }
  
        if (results.length === 1) {
          const teacherName = results[0].teacher_name;
  
          pool.query(
            "SELECT id FROM image_file WHERE teacher_id = ?",
            [data.teacher_id],
            (imageError, imageResults) => {
              if (imageError) {
                console.log(imageError);
                return callBack(imageError);
              }
  
              if (imageResults.length === 0) {
                pool.query(
                  "INSERT INTO image_file (teacher_id, name, path) VALUES (?, ?, ?)",
                  [data.teacher_id, data.name, data.path],
                  (insertError, insertResults) => {
                    if (insertError) {
                      console.log(insertError);
                      return callBack(insertError);
                    }
  
                    pool.query(
                      "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                      [data.user_id, "Added Teacher's Image: " + teacherName],
                      (logError, logResults) => {
                        if (logError) {
                          console.log(logError);
                          return callBack(logError);
                        }
  
                        return callBack(null, insertResults);
                      }
                    );
                  }
                );
              } else {
                return callBack(null, "Image for this teacher already exists.");
              }
            }
          );
        } else {
          return callBack("Teacher not found.");
        }
      }
    );
  },
  

  addTeacher: (data, callBack) => {
    pool.query(
      "SELECT surname, givenname FROM teachers WHERE surname=? AND givenname=?",
      [data.surname, data.givenname],
      (error, results) => {
        if (results.length == 0) {
          pool.query(
            "INSERT INTO teachers (surname, givenname,middlename, department_id, is_part_time, is_active) VALUES (?,?,?,?,?,?)",
            [
              data.surname,
              data.givenname,
              data.middlename,
              data.department_id,
              data.is_part_time,
              data.is_active,
            ],
            (error, results) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Added Teacher: " + data.givenname + " " + data.surname,
                ],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                }
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, results);
            }
          );
        } else {
          return callBack(results);
        }
      }
    );
  },

  updateTeacher: (data, callBack) => {
    pool.query(
      "UPDATE teachers SET surname=?, givenname=?, middlename=?, department_id=?, is_part_time=?, is_active=? WHERE id=?",
      [
        data.surname,
        data.givenname,
        data.middlename,
        data.department_id,
        data.is_part_time,
        data.is_active,
        data.id,
      ],
      (error, results) => {
        if (results.changedRows == 1) {
          pool.query(
            "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
            [
              data.user_id,
              "Updated Teacher: " + data.givenname + " " + data.surname,
            ],
            (error, results) => {
              if (error) {
                console.log(error);
              }
            }
          );
        }
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      }
    );
  },

  deleteTeacher: (data, callBack) => {
    pool.query(
      "SELECT givenname, surname FROM teachers WHERE id=?",
      [data.id],
      (error, result) => {
        pool.query(
          "DELETE FROM teachers WHERE id=?",
          [data.id],
          (error, results) => {
            if (results.affectedRows == 1) {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  "Deleted Teacher: " +
                    result[0].givenname +
                    " " +
                    result[0].surname,
                ],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                }
              );
            }
            if (error) {
              callBack(error);
            }
            return callBack(null, results);
          }
        );
        if (error) {
          return callBack(error);
        }
      }
    );
  },
};
