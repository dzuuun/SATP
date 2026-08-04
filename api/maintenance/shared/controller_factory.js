function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function invoke(method, ...args) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (error, result) => {
      if (settled) return;
      settled = true;
      if (error) return reject(error);
      return resolve(result);
    };
    try {
      method(...args, done);
    } catch (error) {
      done(error);
    }
  });
}

function normalizeError(error, duplicateMessage) {
  if (!(error instanceof Error) || error.code === "ER_DUP_ENTRY") {
    const conflict = new Error(duplicateMessage || "Record already exists.");
    conflict.statusCode = 409;
    return conflict;
  }
  return error;
}

function createMaintenanceController(model, definitions) {
  const controller = {};

  Object.entries(definitions).forEach(([name, definition]) => {
    controller[name] = asyncHandler(async (req, res) => {
      const method = model[definition.method];
      if (typeof method !== "function") {
        const error = new Error(`Maintenance service ${definition.method} is unavailable.`);
        error.statusCode = 500;
        throw error;
      }

      const args = definition.input ? [definition.input(req)] : [];
      let result;
      try {
        result = await invoke(method, ...args);
      } catch (error) {
        throw normalizeError(error, definition.duplicateMessage);
      }

      if (definition.type === "list") {
        const data = Array.isArray(result) ? result : [];
        return res.json({
          success: 1,
          message: definition.message,
          count: data.length,
          data,
        });
      }

      if (definition.type === "one") {
        const data = Array.isArray(result) ? result : result ? [result] : [];
        if (!data.length) {
          return res.status(404).json({
            success: 0,
            message: definition.notFoundMessage || "Record not found.",
          });
        }
        return res.json({ success: 1, message: definition.message, data });
      }

      if (definition.type === "update" && result?.changedRows === 0) {
        return res.json({
          success: 0,
          message: "Contents are still the same.",
        });
      }

      return res.status(definition.status || 200).json({
        success: 1,
        message: definition.message,
        ...(definition.includeData === false ? {} : { data: result }),
      });
    });
  });

  return controller;
}

const input = {
  body: (req) => ({ ...req.body, user_id: req.user.id }),
  id: (req) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      const error = new Error("A valid record ID is required.");
      error.statusCode = 400;
      throw error;
    }
    return id;
  },
};

function createStandardController(model, options) {
  const definitions = {};
  Object.entries(options.actions).forEach(([exportName, action]) => {
    const [method, type, inputType] = action;
    const entity = options.entity;
    const plural = options.plural;
    const messages = {
      list: `${plural} retrieved successfully.`,
      active: `Active ${plural.toLowerCase()} retrieved successfully.`,
      one: `${entity} retrieved successfully.`,
      create: `${entity} added successfully.`,
      update: `${entity} updated successfully.`,
      delete: `${entity} deleted successfully.`,
    };
    definitions[exportName] = {
      method,
      type: type === "active" ? "list" : type,
      input: inputType ? input[inputType] : undefined,
      status: type === "create" ? 201 : 200,
      includeData: !["update", "delete"].includes(type),
      message: messages[type],
      duplicateMessage: `${entity} already exists.`,
    };
  });
  return createMaintenanceController(model, definitions);
}

module.exports = {
  createMaintenanceController,
  createStandardController,
  input,
};
