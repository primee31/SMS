export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync(req[source]);
      if (source === 'query') {
        req.validatedQuery = validated;
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, validated);
      } else {
        req[source] = validated;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
