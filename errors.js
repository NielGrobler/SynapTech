
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

class AuthorizationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

class DownloadError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'DownloadError';
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

class UploadError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'UploadError';
    this.statusCode = statusCode;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

class BadUploadTypeError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'BadUploadTypeError';
    this.statusCode = 415;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

export { ValidationError, AuthorizationError, UploadError, DownloadError, BadUploadTypeError };
