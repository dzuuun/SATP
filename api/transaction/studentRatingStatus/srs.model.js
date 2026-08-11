const pool = require("../../../db/db");

module.exports = {
  getRatingAccess: (callBack) => {
    pool.query(
      "SELECT setting_key, setting_value, updated_at FROM system_settings WHERE setting_key IN ('student_rating_enabled', 'student_rating_shs_enabled', 'student_rating_non_shs_enabled')",
      (error, results) => {
        if (error) return callBack(error);
        const settings = new Map(
          results.map((row) => [row.setting_key, row]),
        );
        const legacy = settings.get("student_rating_enabled");
        const shs = settings.get("student_rating_shs_enabled") || legacy;
        const nonShs =
          settings.get("student_rating_non_shs_enabled") || legacy;
        return callBack(null, {
          shs_enabled: shs ? Number(shs.setting_value) === 1 : true,
          non_shs_enabled: nonShs
            ? Number(nonShs.setting_value) === 1
            : true,
          updated_at:
            shs?.updated_at || nonShs?.updated_at || legacy?.updated_at || null,
        });
      },
    );
  },

  getStudentRatingGroup: (userId, callBack) => {
    pool.query(
      `SELECT CASE WHEN UPPER(TRIM(departments.code)) = 'SHS' THEN 'shs' ELSE 'non_shs' END AS rating_group
       FROM user_info
       INNER JOIN courses ON user_info.course_id = courses.id
       INNER JOIN departments ON courses.department_id = departments.id
       WHERE user_info.user_id = ?
       LIMIT 1`,
      [userId],
      (error, results) => {
        if (error) return callBack(error);
        return callBack(null, results[0]?.rating_group || "non_shs");
      },
    );
  },

  canManageRatingAccess: (userId, callBack) => {
    pool.query(
      `SELECT users.id
       FROM users
       INNER JOIN permissions ON users.permission_id = permissions.id
       WHERE users.id = ?
         AND users.is_active = 1
         AND permissions.name IN ('System Administrator', 'Super Admin')
       LIMIT 1`,
      [userId],
      (error, results) => {
        if (error) return callBack(error);
        return callBack(null, results.length > 0);
      },
    );
  },

  setRatingAccess: (data, callBack) => {
    pool.query(
      `SELECT users.id
       FROM users
       INNER JOIN permissions ON users.permission_id = permissions.id
       WHERE users.id = ?
         AND users.is_active = 1
         AND permissions.name IN ('System Administrator', 'Super Admin')
       LIMIT 1`,
      [data.user_id],
      (accessError, users) => {
        if (accessError) return callBack(accessError);
        if (!users.length) {
          const error = new Error(
            "You do not have permission to change student rating access.",
          );
          error.statusCode = 403;
          return callBack(error);
        }
        pool.query(
          `INSERT INTO system_settings (setting_key, setting_value, updated_by)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             setting_value = VALUES(setting_value),
             updated_by = VALUES(updated_by),
             updated_at = CURRENT_TIMESTAMP`,
          [
            data.group === "shs"
              ? "student_rating_shs_enabled"
              : "student_rating_non_shs_enabled",
            data.enabled ? "1" : "0",
            data.user_id,
          ],
          (settingError) => {
            if (settingError) return callBack(settingError);
            const groupName = data.group === "shs" ? "SHS" : "College";
            const action = data.enabled
              ? `Opened ${groupName} student rating access`
              : `Closed ${groupName} student rating access`;
            pool.query(
              "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
              [data.user_id, action],
              (logError) => {
                if (logError) {
                  console.error(
                    "Unable to log the rating access change:",
                    logError,
                  );
                }
                return callBack(null, {
                  group: data.group,
                  enabled: Boolean(data.enabled),
                });
              },
            );
          },
        );
      },
    );
  },

  // updated for new table
  getTransactions: (data, callBack) => {
    pool.query(
      // "SELECT transactions.id, transactions.user_id, school_years.name AS school_year, semesters.name AS semester, transactions.status, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, courses.name AS course, departments.name AS department, colleges.name AS college, colleges.code AS college_code, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name FROM transactions INNER JOIN users ON transactions.user_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON transactions.subject_id = subjects.id INNER JOIN teachers ON transactions.teacher_id = teachers.id INNER JOIN school_years ON transactions.school_year_id=school_years.id INNER JOIN semesters ON transactions.semester_id=semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE transactions.school_year_id=? AND transactions.semester_id=?",
      "SELECT school_years.name AS SchoolYear, semesters.name AS Semester, users.username AS IDNumber, CONCAT(user_info.surname, ', ', user_info.givenname) AS FullName, user_info.year_level AS YearLevel, courses.name AS Program, departments.name AS Department, colleges.name AS College, COUNT(academic_records_consolidated.subject_id) AS TotalSubjects, SUM( CASE WHEN academic_records_consolidated.status = 0 THEN 1 ELSE 0 END ) AS PendingStatusCount FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id =? GROUP BY school_years.name, semesters.name, users.id, users.username, user_info.surname, user_info.givenname, user_info.year_level, courses.name, departments.name, colleges.name ORDER BY Program, Department, user_info.surname;",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  // updated for new table
  getTransactionsByStudent: (data, callBack) => {
    pool.query(
      "SELECT academic_records_consolidated.id, academic_records_consolidated.status, academic_records_consolidated.student_id, school_years.name AS school_year, semesters.name AS semester, academic_records_consolidated.status, users.username, CONCAT( user_info.givenname, ' ', user_info.surname ) AS student_name, subjects.code AS subject_code, subjects.name AS subject_name, CONCAT( teachers.givenname, ' ', teachers.surname ) AS teachers_name FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON academic_records_consolidated.subject_id = subjects.id INNER JOIN teachers ON academic_records_consolidated.teacher_id = teachers.id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id = ? AND users.username = ?",
      [data.school_year_id, data.semester_id, data.student_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getAcademicRecordsByStudent: (data, callBack) => {
    pool.query(
      `SELECT
        ar.id,
        ar.status,
        ar.student_id,
        sy.name AS school_year,
        sem.name AS semester,
        u.username,
        CONCAT(ui.givenname, ' ', ui.surname) AS student_name,
        s.code AS subject_code,
        s.name AS subject_name,
        CONCAT(t.givenname, ' ', t.surname) AS teachers_name
      FROM academic_records_consolidated AS ar
      INNER JOIN users AS u ON ar.student_id = u.id
      INNER JOIN user_info AS ui ON u.id = ui.user_id
      INNER JOIN subjects AS s ON ar.subject_id = s.id
      INNER JOIN teachers AS t ON ar.teacher_id = t.id
      INNER JOIN school_years AS sy ON ar.school_year_id = sy.id
      INNER JOIN semesters AS sem ON ar.semester_id = sem.id
      WHERE ar.school_year_id = ?
        AND ar.semester_id = ?
        AND ar.student_id = ?
        AND COALESCE(ar.is_excluded, 0) = 0
      ORDER BY s.code, t.surname, t.givenname`,
      [data.school_year_id, data.semester_id, data.student_id],
      (error, results) => {
        if (error) return callBack(error);
        return callBack(null, results);
      },
    );
  },

  // updated for new table
  getSYSemData: (data, callBack) => {
    pool.query(
      "SELECT COUNT(*) AS TotalStudents, SUM(CASE WHEN PendingStatusCount = 0 THEN 1 ELSE 0 END) AS FullyRatedCount, SUM(CASE WHEN PendingStatusCount > 0 THEN 1 ELSE 0 END) AS IncompleteCount FROM ( SELECT student_id, SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS PendingStatusCount FROM academic_records_consolidated WHERE school_year_id = ? AND semester_id = ? GROUP BY student_id ) AS StudentSummaries;",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getTransactionInfoById: (Id, callBack) => {
    pool.query(
      `SELECT
        ar.id,
        ar.status,
        ar.student_id,
        sy.name AS school_year,
        sem.name AS semester,
        u.username,
        CONCAT(ui.givenname, ' ', ui.surname) AS student_name,
        s.code AS subject_code,
        s.name AS subject_name,
        CONCAT(t.givenname, ' ', t.surname) AS teachers_name
      FROM academic_records_consolidated AS ar
      INNER JOIN users AS u ON ar.student_id = u.id
      INNER JOIN user_info AS ui ON u.id = ui.user_id
      INNER JOIN subjects AS s ON ar.subject_id = s.id
      INNER JOIN teachers AS t ON ar.teacher_id = t.id
      INNER JOIN school_years AS sy ON ar.school_year_id = sy.id
      INNER JOIN semesters AS sem ON ar.semester_id = sem.id
      WHERE ar.id = ?`,
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  getCommentByTransactionId: (Id, callBack) => {
    pool.query(
      "SELECT comment, student_id FROM academic_records_consolidated WHERE id = ?",
      [Id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },

  addTransaction: (data, callBack) => {
    pool.query(
      "SELECT id, teacher_id FROM transactions WHERE school_year_id=? AND semester_id=? AND subject_id=? AND teacher_id=? AND user_id=? LIMIT 1",
      [
        data.school_year_id,
        data.semester_id,
        data.subject_id,
        data.teacher_id,
        data.id,
      ],
      (error, results) => {
        if (error) return callBack(error);
        if (results.length === 0) {
          pool.query(
            "INSERT INTO transactions(school_year_id, semester_id, subject_id, teacher_id, user_id) VALUES (?,?,?,?,?)",
            [
              data.school_year_id,
              data.semester_id,
              data.subject_id,
              data.teacher_id,
              data.id,
            ],
            (error, result) => {
              if (error) return callBack(error);
              pool.query(
                `SELECT users.username, records.schedule_code
                 FROM academic_records_consolidated AS records
                 INNER JOIN users ON users.id = records.student_id
                 WHERE records.student_id = ?
                   AND records.school_year_id = ?
                   AND records.semester_id = ?
                   AND records.subject_id = ?
                 LIMIT 1`,
                [
                  data.id,
                  data.school_year_id,
                  data.semester_id,
                  data.subject_id,
                ],
                (detailsError, records) => {
                  if (detailsError) {
                    return console.log(detailsError);
                  }
                  const student = records[0];
                  const username = student?.username || "Unknown student";
                  const scheduleCode = student?.schedule_code || "No schedule code";
                  pool.query(
                    "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                    [
                      data.user_id,
                      `Added transaction for student ${username} | Schedule ${scheduleCode}`,
                    ],
                    (logError) => {
                      if (logError) console.log(logError);
                    },
                  );
                },
              );
              return callBack(null, result);
            },
          );
        } else {
          return callBack(null, {
            insertId: results[0].id,
            exists: true,
            skipped: true,
          });
        }
      },
    );
  },

  // submitRating: (data, callBack) => {
  //   pool.query(
  //     "INSERT INTO trans_item (transaction_id, item_id, rate) VALUES (?,?,?)",
  //     [data.transaction_id, data.item_id, data.rate],
  //     (error, results) => {
  //       if (error) {
  //         callBack(error);
  //       }
  //       return callBack(null, results);
  //     }
  //   );
  // },

  submitRating: (data, callBack) => {
    pool.query(
      "SELECT * FROM trans_item WHERE transaction_id = ? AND item_id = ?",
      [data.transaction_id, data.item_id],
      (error, results) => {
        if (results.length === 0) {
          pool.query(
            "INSERT INTO trans_item (transaction_id, item_id, rate) VALUES (?,?,?)",
            [data.transaction_id, data.item_id, data.rate],
            (error, results) => {
              if (error) {
                callBack(error);
              }
              return callBack(null, results);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  submitCommentStatus: (data, callBack) => {
    pool.query(
      "SELECT subjects.code AS subject_code FROM academic_records_consolidated INNER JOIN subjects ON academic_records_consolidated.subject_id = subjects.id WHERE academic_records_consolidated.id = ? AND academic_records_consolidated.student_id = ?",
      [data.transaction_id, data.user_id],
      (error, results) => {
        if (results.length === 1) {
          pool.query(
            "UPDATE academic_records_consolidated SET comment = ?, status = ? WHERE id = ?",
            [data.comment, 1, data.transaction_id],
            (error, result) => {
              pool.query(
                "INSERT INTO activity_log (user_id, date_time, action) VALUES (?,CURRENT_TIMESTAMP,?)",
                [
                  data.user_id,
                  `Rated subject: ${results[0].subject_code}`,
                ],
                (error, results) => {
                  if (error) {
                    console.log(error);
                  }
                },
              );
              if (error) {
                callBack(error);
              }
              return callBack(null, result);
            },
          );
        } else {
          return callBack(results);
        }
      },
    );
  },

  submitAssessment: (data, callBack) => {
    pool.getConnection((connectionError, connection) => {
      if (connectionError) return callBack(connectionError);
      const rollback = (error) =>
        connection.rollback(() => {
          connection.release();
          callBack(error);
        });

      connection.beginTransaction((transactionError) => {
        if (transactionError) {
          connection.release();
          return callBack(transactionError);
        }

        connection.query(
          `SELECT COALESCE(group_setting.setting_value, legacy_setting.setting_value, '1') AS setting_value
           FROM user_info
           INNER JOIN courses ON user_info.course_id = courses.id
           INNER JOIN departments ON courses.department_id = departments.id
           LEFT JOIN system_settings AS group_setting
             ON group_setting.setting_key = CASE
               WHEN UPPER(TRIM(departments.code)) = 'SHS'
                 THEN 'student_rating_shs_enabled'
               ELSE 'student_rating_non_shs_enabled'
             END
           LEFT JOIN system_settings AS legacy_setting
             ON legacy_setting.setting_key = 'student_rating_enabled'
           WHERE user_info.user_id = ?
           LIMIT 1 FOR UPDATE`,
          [data.user_id],
          (accessError, settings) => {
            if (accessError) return rollback(accessError);
            if (settings.length && Number(settings[0].setting_value) !== 1) {
              return rollback(new Error("Student rating is currently closed."));
            }
            connection.query(
              `SELECT
                 academic_records_consolidated.id,
                 academic_records_consolidated.student_id,
                 academic_records_consolidated.school_year_id,
                 academic_records_consolidated.semester_id,
                 academic_records_consolidated.subject_id,
                 academic_records_consolidated.teacher_id,
                 academic_records_consolidated.status,
                 subjects.code AS subject_code
               FROM academic_records_consolidated
               INNER JOIN subjects
                 ON academic_records_consolidated.subject_id = subjects.id
               WHERE academic_records_consolidated.id = ?
               FOR UPDATE`,
              [data.academic_record_id],
              (recordError, records) => {
                if (recordError) return rollback(recordError);
                if (!records.length) {
                  return rollback(new Error("Academic record not found."));
                }
                if (Number(records[0].student_id) !== Number(data.user_id)) {
                  return rollback(
                    new Error("This assessment belongs to another user."),
                  );
                }

                connection.query(
                  "SELECT items.id FROM items INNER JOIN categories ON items.category_id = categories.id WHERE items.is_active = 1 AND categories.is_active = 1",
                  (itemError, activeItems) => {
                    if (itemError) return rollback(itemError);
                    const activeIds = new Set(
                      activeItems.map((item) => Number(item.id)),
                    );
                    const ratings = Array.isArray(data.ratings)
                      ? data.ratings
                      : [];
                    const submittedIds = new Set(
                      ratings.map((rating) => Number(rating.item_id)),
                    );
                    const valid =
                      ratings.length === activeIds.size &&
                      submittedIds.size === activeIds.size &&
                      ratings.every(
                        (rating) =>
                          activeIds.has(Number(rating.item_id)) &&
                          Number(rating.rate) >= 1 &&
                          Number(rating.rate) <= 5,
                      );
                    if (!valid) {
                      return rollback(
                        new Error("Complete every active assessment item."),
                      );
                    }

                    const saveRatings = (transactionId) => connection.query(
                      "DELETE FROM trans_item WHERE transaction_id = ?",
                      [transactionId],
                      (deleteError) => {
                        if (deleteError) return rollback(deleteError);
                        const values = ratings.map((rating) => [
                          transactionId,
                          Number(rating.item_id),
                          Number(rating.rate),
                        ]);
                        connection.query(
                          "INSERT INTO trans_item (transaction_id, item_id, rate) VALUES ?",
                          [values],
                          (insertError) => {
                            if (insertError) return rollback(insertError);
                            connection.query(
                              "UPDATE academic_records_consolidated SET comment = ?, status = 1 WHERE id = ?",
                              [data.comment || null, data.academic_record_id],
                              (updateError) => {
                                if (updateError) return rollback(updateError);
                                connection.query(
                                  "INSERT INTO activity_log (user_id, date_time, action) VALUES (?, CURRENT_TIMESTAMP, ?)",
                                  [
                                    data.user_id,
                                    `Rated subject: ${records[0].subject_code}`,
                                  ],
                                  (logError) => {
                                    if (logError) return rollback(logError);
                                    connection.commit((commitError) => {
                                      if (commitError)
                                        return rollback(commitError);
                                      connection.release();
                                      callBack(null, {
                                        affectedRows: ratings.length,
                                      });
                                    });
                                  },
                                );
                              },
                            );
                          },
                        );
                      },
                    );

                    const record = records[0];
                    connection.query(
                      `INSERT INTO transactions
                         (id, school_year_id, semester_id, subject_id, teacher_id, comment, user_id, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                       ON DUPLICATE KEY UPDATE
                         school_year_id = VALUES(school_year_id),
                         semester_id = VALUES(semester_id),
                         subject_id = VALUES(subject_id),
                         teacher_id = VALUES(teacher_id),
                         comment = VALUES(comment),
                         user_id = VALUES(user_id),
                         status = 1`,
                      [
                        record.id,
                        record.school_year_id,
                        record.semester_id,
                        record.subject_id,
                        record.teacher_id,
                        data.comment || null,
                        record.student_id,
                      ],
                      (parentError) => {
                        if (parentError) return rollback(parentError);
                        connection.query(
                          `DELETE FROM transactions
                           WHERE id <> ?
                             AND school_year_id = ?
                             AND semester_id = ?
                             AND subject_id = ?
                             AND teacher_id = ?
                             AND user_id = ?`,
                          [
                            record.id,
                            record.school_year_id,
                            record.semester_id,
                            record.subject_id,
                            record.teacher_id,
                            record.student_id,
                          ],
                          (cleanupError) => {
                            if (cleanupError) return rollback(cleanupError);
                            return saveRatings(record.id);
                          },
                        );
                      },
                    );
                  },
                );
              },
            );
          },
        );
      });
    });
  },

  // updated for new table
  getNotRatedTransactions: (data, callBack) => {
    pool.query(
      "SELECT school_years.name AS SchoolYear, semesters.name AS Semester, users.username AS IDNumber, user_info.givenname AS FirstName, user_info.surname AS LastName, user_info.year_level AS YearLevel, courses.name AS Program, departments.name AS Department, colleges.name AS College, subjects.code AS SubjectCode, CONCAT( teachers.surname, ', ', teachers.givenname ) AS Teacher FROM academic_records_consolidated INNER JOIN users ON academic_records_consolidated.student_id = users.id INNER JOIN user_info ON users.id = user_info.user_id INNER JOIN subjects ON academic_records_consolidated.subject_id = subjects.id INNER JOIN teachers ON academic_records_consolidated.teacher_id = teachers.id INNER JOIN school_years ON academic_records_consolidated.school_year_id = school_years.id INNER JOIN semesters ON academic_records_consolidated.semester_id = semesters.id INNER JOIN courses ON user_info.course_id = courses.id INNER JOIN departments ON courses.department_id = departments.id INNER JOIN colleges ON departments.college_id = colleges.id WHERE academic_records_consolidated.school_year_id = ? AND academic_records_consolidated.semester_id = ? AND academic_records_consolidated.status = 0 ORDER BY program, department",
      [data.school_year_id, data.semester_id],
      (error, results) => {
        if (error) {
          callBack(error);
        }
        return callBack(null, results);
      },
    );
  },
};
