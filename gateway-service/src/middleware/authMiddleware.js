import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError, env } from "@platform/shared";

export function requireAuth(req, _res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return next(new UnauthorizedError("Missing bearer token"));
  }

  try {
    req.auth = jwt.verify(token, env.JWT_SECRET);
    return next();
  } catch (_error) {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireAdmin(req, _res, next) {
  if (req.auth?.role !== "admin") {
    return next(new ForbiddenError("Admin role required"));
  }

  return next();
}

