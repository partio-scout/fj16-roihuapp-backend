export function createHTTPError(message, code, err) {
  const newError = new Error(message);
  newError.status = code;
  newError.originalError = err;
  delete newError['stack'];
  return newError;
}
