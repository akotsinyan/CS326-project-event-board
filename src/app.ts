import path from "node:path";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import Layouts from "express-ejs-layouts";
import type { IAuthController } from "./auth/AuthController";
import type { IEventListController } from "./features/EventList/EventListController";
import type { IEventEditingController } from "./features/EventEditing/EventEditingController";
import type { IEventPublishingController } from "./features/EventPublishing/EventPublishingController";
import type { IEventDetailController } from "./features/EventDetailPage/EventDetailPageController";
import type { IPastEventArchivingController } from "./features/PastEventArchiving/PastEventArchivingController";
import type { IRsvpToggleController } from "./features/RsvpToggle/RsvpToggleController";
import type { IRSVPDashboardController } from "./features/RSVPDashboard/RSVPDashboardController";
import type { IEventController } from "./features/CreateEvent/controller/EventController";
import type { ISaveForLaterController } from "./features/SaveForLater/SaveForLaterController";
import { AuthenticationRequired, AuthorizationRequired } from "./auth/errors";
import type { UserRole } from "./auth/User";
import type { IApp } from "./contracts";
import {
  getAuthenticatedUser,
  isAuthenticatedSession,
  AppSessionStore,
  recordPageView,
  touchAppSession,
} from "./session/AppSession";
import type { ILoggingService } from "./service/LoggingService";

type AsyncRequestHandler = RequestHandler;

function asyncHandler(fn: AsyncRequestHandler) {
  return function wrapped(req: Request, res: Response, next: (value?: unknown) => void) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sessionStore(req: Request): AppSessionStore {
  return req.session as AppSessionStore;
}

class ExpressApp implements IApp {
  private readonly app: express.Express;

  constructor(
    private readonly authController: IAuthController,
    private readonly eventListController: IEventListController,
    private readonly eventEditingController: IEventEditingController,
    private readonly eventPublishingController: IEventPublishingController,
    private readonly eventDetailController: IEventDetailController,
    private readonly pastArchivingController: IPastEventArchivingController,
    private readonly rsvpToggleController: IRsvpToggleController,
    private readonly rsvpDashboardController: IRSVPDashboardController,
    private readonly createEventController: IEventController,
    private readonly saveForLaterController: ISaveForLaterController,
    private readonly logger: ILoggingService,
  ) {
    this.app = express();
    this.registerMiddleware();
    this.registerTemplating();
    this.registerRoutes();
  }

  private registerMiddleware(): void {
    this.app.use(express.static(path.join(process.cwd(), "src/static")));
    this.app.use(
      session({
        name: "app.sid",
        secret: process.env.SESSION_SECRET ?? "project-starter-demo-secret",
        resave: false,
        saveUninitialized: false,
        cookie: { httpOnly: true, sameSite: "lax" },
      }),
    );
    this.app.use(Layouts);
    this.app.use(express.urlencoded({ extended: true }));
  }

  private registerTemplating(): void {
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(process.cwd(), "src/views"));
    this.app.set("layout", "layouts/base");
  }

  private isHtmxRequest(req: Request): boolean {
    return req.get("HX-Request") === "true";
  }

  private requireAuthenticated(req: Request, res: Response): boolean {
    const store = sessionStore(req);
    touchAppSession(store);

    if (getAuthenticatedUser(store)) return true;

    this.logger.warn("Blocked unauthenticated request to a protected route");
    if (this.isHtmxRequest(req) || req.method !== "GET") {
      res.status(401).render("partials/error", {
        message: AuthenticationRequired("Please log in to continue.").message,
        layout: false,
      });
      return false;
    }

    res.redirect("/login");
    return false;
  }

  private requireRole(req: Request, res: Response, allowedRoles: UserRole[], message: string): boolean {
    if (!this.requireAuthenticated(req, res)) return false;

    const currentUser = getAuthenticatedUser(sessionStore(req));
    if (currentUser && allowedRoles.includes(currentUser.role)) return true;

    this.logger.warn(`Blocked unauthorized request for role ${currentUser?.role ?? "unknown"}`);
    res.status(403).render("partials/error", {
      message: AuthorizationRequired(message).message,
      layout: false,
    });
    return false;
  }

  private registerRoutes(): void {
    // ── Public routes ────────────────────────────────────────────────────────

    this.app.get("/", asyncHandler(async (req, res) => {
      this.logger.info("GET /");
      res.redirect(isAuthenticatedSession(sessionStore(req)) ? "/home" : "/login");
    }));

    this.app.get("/login", asyncHandler(async (req, res) => {
      const store = sessionStore(req);
      if (getAuthenticatedUser(store)) { res.redirect("/home"); return; }
      await this.authController.showLogin(res, recordPageView(store));
    }));

    this.app.post("/login", asyncHandler(async (req, res) => {
      const email = typeof req.body.email === "string" ? req.body.email : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";
      await this.authController.loginFromForm(res, email, password, sessionStore(req));
    }));

    this.app.post("/logout", asyncHandler(async (req, res) => {
      await this.authController.logoutFromForm(res, sessionStore(req));
    }));

    // ── Admin routes ─────────────────────────────────────────────────────────

    this.app.get("/admin/users", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin"], "Only admins can manage users.")) return;
      await this.authController.showAdminUsers(res, recordPageView(sessionStore(req)));
    }));

    this.app.post("/admin/users", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin"], "Only admins can manage users.")) return;
      const roleValue = typeof req.body.role === "string" ? req.body.role : "user";
      const role: UserRole =
        roleValue === "admin" || roleValue === "staff" || roleValue === "user" ? roleValue : "user";
      await this.authController.createUserFromForm(
        res,
        {
          email: typeof req.body.email === "string" ? req.body.email : "",
          displayName: typeof req.body.displayName === "string" ? req.body.displayName : "",
          password: typeof req.body.password === "string" ? req.body.password : "",
          role,
        },
        touchAppSession(sessionStore(req)),
      );
    }));

    this.app.post("/admin/users/:id/delete", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin"], "Only admins can manage users.")) return;
      const currentUser = getAuthenticatedUser(sessionStore(req));
      if (!currentUser) { res.status(401).render("partials/error", { message: "Please log in.", layout: false }); return; }
      await this.authController.deleteUserFromForm(
        res,
        typeof req.params.id === "string" ? req.params.id : "",
        currentUser.userId,
        touchAppSession(sessionStore(req)),
      );
    }));

    // ── Authenticated home ────────────────────────────────────────────────────

    this.app.get("/home", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const browserSession = recordPageView(sessionStore(req));
      this.logger.info(`GET /home for ${browserSession.browserLabel}`);
      res.render("home", { session: browserSession, pageError: null });
    }));

    // ── Event list & search ───────────────────────────────────────────────────

    this.app.get("/events", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.eventListController.showEventList(req, res);
    }));

    // ── Event creation (must come before /events/:eventId) ────────────────────

    this.app.get("/events/new", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can create events.")) return;
      this.createEventController.renderCreateEventPage(req, res);
    }));

    this.app.post("/events/new", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can create events.")) return;
      await this.createEventController.create(req, res, touchAppSession(sessionStore(req)));
    }));

    // ── Past event archive (must come before /events/:eventId) ───────────────

    this.app.get("/events/archive", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.pastArchivingController.showArchive(req, res);
    }));

    // ── Event detail (parameterized — must come after specific routes) ────────

    this.app.get("/events/:eventId", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.eventDetailController.showEvent(req, res);
    }));

    // ── Event editing ─────────────────────────────────────────────────────────

    this.app.get("/events/:eventId/edit", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can edit events.")) return;
      await this.eventEditingController.showEditForm(req, res);
    }));

    this.app.post("/events/:eventId/edit", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can edit events.")) return;
      await this.eventEditingController.submitEditForm(req, res);
    }));

    // ── Event publishing / cancellation ───────────────────────────────────────

    this.app.post("/events/:eventId/publish", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can publish events.")) return;
      await this.eventPublishingController.publishEvent(req, res);
    }));

    this.app.post("/events/:eventId/cancel", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers and admins can cancel events.")) return;
      await this.eventPublishingController.cancelEvent(req, res);
    }));

    // ── RSVP toggle ───────────────────────────────────────────────────────────

    this.app.post("/events/:eventId/rsvp", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.rsvpToggleController.toggleRsvp(req, res);
    }));

    this.app.get("/events/:eventId/rsvp/status", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.rsvpToggleController.getRsvpStatus(req, res);
    }));

    // ── Save for later ────────────────────────────────────────────────────────

    this.app.post("/events/:eventId/save", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.saveForLaterController.toggleFromButton(req, res);
    }));

    this.app.get("/saved", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.saveForLaterController.showSavedPage(req, res);
    }));

    // ── RSVP dashboard ────────────────────────────────────────────────────────

    this.app.get("/rsvps/dashboard", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["user"], "Only members can view the RSVP dashboard.")) return;
      await this.rsvpDashboardController.showDashboard(req, res);
    }));

    // ── Error handler ─────────────────────────────────────────────────────────

    this.app.use((err: unknown, _req: Request, res: Response, _next: (value?: unknown) => void) => {
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      this.logger.error(message);
      res.status(500).render("partials/error", { message: "Unexpected server error.", layout: false });
    });
  }

  getExpressApp(): express.Express {
    return this.app;
  }
}

export function CreateApp(
  authController: IAuthController,
  eventListController: IEventListController,
  eventEditingController: IEventEditingController,
  eventPublishingController: IEventPublishingController,
  eventDetailController: IEventDetailController,
  pastArchivingController: IPastEventArchivingController,
  rsvpToggleController: IRsvpToggleController,
  rsvpDashboardController: IRSVPDashboardController,
  createEventController: IEventController,
  saveForLaterController: ISaveForLaterController,
  logger: ILoggingService,
): IApp {
  return new ExpressApp(
    authController,
    eventListController,
    eventEditingController,
    eventPublishingController,
    eventDetailController,
    pastArchivingController,
    rsvpToggleController,
    rsvpDashboardController,
    createEventController,
    saveForLaterController,
    logger,
  );
}
