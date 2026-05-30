import express from "express";
import { loginSchema, registrationSchema } from "@platform/shared";
import { requireAuth } from "../middleware/authMiddleware.js";
import { AuthService } from "../services/authService.js";

const router = express.Router();
const service = new AuthService();

router.post("/register", async (req, res, next) => {
  try {
    const payload = registrationSchema.parse(req.body);
    const response = await service.register(payload);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const response = await service.login(payload);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await service.getProfile(req.auth.sub, req.auth.organizationId);
    res.json({ user: profile });
  } catch (error) {
    next(error);
  }
});

export default router;

