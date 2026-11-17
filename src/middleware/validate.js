function formatZodErrors(error) {
  const issues = error.issues || error.errors || [];
  return issues.map(err => ({
    field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
    message: err.message
  }));
}

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: formatZodErrors(result.error)
      });
    }
    req.body = result.data;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter validation error',
        errors: formatZodErrors(result.error)
      });
    }
    req.query = result.data;
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery
};
