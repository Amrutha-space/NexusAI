import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError, ROLES, env } from "@platform/shared";
import { AuthRepository } from "../repositories/authRepository.js";

const repository = new AuthRepository();

export class AuthService {
  async register(payload) {
    const existingUser = await repository.findUserByEmail(payload.email);
    if (existingUser) {
      throw new AppError("A user with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const result = await repository.createOrganizationWithOwner({
      ...payload,
      passwordHash,
      role: ROLES.ADMIN
    });

    return this.issueAuthResponse({
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        organizationId: result.organization.id,
        organizationName: result.organization.name,
        role: result.role
      }
    });
  }

  async login(payload) {
    const user = await repository.findUserByEmail(payload.email);
    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password_hash);
    if (!passwordMatches) {
      throw new AppError("Invalid email or password", 401);
    }

    return this.issueAuthResponse({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organization_id,
        organizationName: user.organization_name,
        role: user.role
      }
    });
  }

  async getProfile(userId, organizationId) {
    const profile = await repository.getProfile(userId, organizationId);
    if (!profile) {
      throw new AppError("Profile not found", 404);
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      organization: {
        id: profile.organization_id,
        name: profile.organization_name,
        billingRate: Number(profile.billing_rate)
      }
    };
  }

  issueAuthResponse({ user }) {
    const token = jwt.sign(
      {
        sub: user.id,
        organizationId: user.organizationId,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return { token, user };
  }
}

