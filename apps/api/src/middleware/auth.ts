import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { MiddlewareHandler } from "hono";
import type { ApiResponse } from "@plae/shared";
import type { Bindings } from "../bindings";
import { normalizeEmail, sha256Hex } from "../lib/hash";
import { upsertUser, type UserRole } from "../services/users";

const GOOGLE_JWKS_URL = new URL("https://www.googleapis.com/oauth2/v3/certs");
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// jose caches keys internally with sensible defaults (~10 min cooldown).
const jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

export type AuthenticatedUser = {
  userId: string;
  emailDomain: string;
  role: UserRole;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

type GoogleIdTokenPayload = JWTPayload & {
  email?: string;
  email_verified?: boolean;
  hd?: string;
};

function unauthorized(message: string, code = "unauthorized") {
  const body: ApiResponse<never> = { ok: false, error: { code, message } };
  return body;
}

export const requireAuth = (): MiddlewareHandler<{ Bindings: Bindings }> => {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return c.json(unauthorized("missing bearer token"), 401);
    }

    const clientId = c.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      const body: ApiResponse<never> = {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "GOOGLE_OAUTH_CLIENT_ID is not set",
        },
      };
      return c.json(body, 500);
    }

    let payload: GoogleIdTokenPayload;
    try {
      const result = await jwtVerify<GoogleIdTokenPayload>(token, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: clientId,
      });
      payload = result.payload;
    } catch {
      return c.json(unauthorized("token verification failed", "invalid_token"), 401);
    }

    const email = payload.email;
    if (!email || payload.email_verified !== true) {
      return c.json(
        unauthorized("email not verified by issuer", "email_unverified"),
        401,
      );
    }

    const normalized = normalizeEmail(email);
    const domain = normalized.split("@")[1] ?? "";
    const allowedDomain = (c.env.ALLOWED_EMAIL_DOMAIN ?? "").trim().toLowerCase();
    if (allowedDomain && domain !== allowedDomain) {
      return c.json(
        unauthorized("email domain not allowed", "domain_not_allowed"),
        403,
      );
    }

    const userId = await sha256Hex(normalized);
    const row = await upsertUser(c.env.DB, { userId, emailDomain: domain });

    // The teacher role is derived from the TEACHER_EMAILS env var, not the DB
    // — for a one-time deployment that avoids a migration / admin tooling.
    const teacherEmails = (c.env.TEACHER_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const role: UserRole = teacherEmails.includes(normalized)
      ? "teacher"
      : "student";

    c.set("user", { userId: row.user_id, emailDomain: row.email_domain, role });
    await next();
  };
};

// Gate for teacher-only routes. Must run after requireAuth().
export const requireTeacher = (): MiddlewareHandler<{ Bindings: Bindings }> => {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      const body: ApiResponse<never> = {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "requireTeacher used before requireAuth",
        },
      };
      return c.json(body, 500);
    }
    if (user.role !== "teacher") {
      const body: ApiResponse<never> = {
        ok: false,
        error: { code: "forbidden", message: "teacher role required" },
      };
      return c.json(body, 403);
    }
    await next();
  };
};
