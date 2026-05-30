import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError, env } from "@platform/shared";

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return next(new UnauthorizedError("Missing bearer token"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.auth = payload;
    next();
  } catch (_error) {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (req.auth?.role !== role) {
      return next(new ForbiddenError("Insufficient permissions"));
    }

    return next();
  };
}

