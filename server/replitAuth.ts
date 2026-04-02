import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { emailService } from "./emailService";

const isReplitEnvironment = !!(process.env.REPL_ID && process.env.REPLIT_DOMAINS);

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Create session store once to avoid connection pool exhaustion
let sessionStoreInstance: any = null;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Create PostgreSQL session store only once (reuse the connection pool)
  if (!sessionStoreInstance) {
    const PgSession = connectPg(session);
    sessionStoreInstance = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Cleanup expired sessions every 15 minutes
    });
    console.log(`Setting up session with PostgreSQL store (${isProduction ? 'production' : 'development'} mode)`);
  }
  
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-for-sdp-global-pay-2025',
    store: sessionStoreInstance,
    resave: false,
    saveUninitialized: false, // Don't create session until something is stored
    name: 'sessionid',
    cookie: {
      httpOnly: true, // Prevent JavaScript access to cookies (XSS protection)
      secure: isProduction, // Only send cookies over HTTPS in production
      sameSite: 'lax', // CSRF protection while allowing OAuth redirects to work
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  const userId = claims["sub"];
  const email = claims["email"];
  const firstName = claims["first_name"];
  
  // Check if this is a new user (not an existing one)
  const existingUser = await storage.getUser(userId);
  const isNewUser = !existingUser;
  
  const user = await storage.upsertUser({
    id: userId,
    email: email,
    firstName: firstName,
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  // Send registration confirmation email for new users
  if (isNewUser && firstName && email) {
    try {
      // Default to business user registration email since Replit auth users are typically business users
      await emailService.sendBusinessRegistrationConfirmation(
        email,
        firstName,
        'enterprise' // Default to enterprise type for Replit auth users
      );
      console.log('Registration confirmation email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send registration confirmation email:', emailError);
      // Don't fail the registration if email sending fails
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  // Session middleware is now setup in routes.ts before this function
  app.use(passport.initialize());
  app.use(passport.session());

  if (!isReplitEnvironment) {
    return;
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
