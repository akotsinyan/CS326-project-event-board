import request from "supertest";
import { createComposedApp } from "../../src/composition";

// Boot the app once for all tests
const app = createComposedApp().getExpressApp();

// Helper: log in and return the session cookie
async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post("/login")
    .type("form")
    .send({ email, password });

  const cookie = res.headers["set-cookie"];
  if (!cookie) throw new Error("No session cookie returned after login");
  return Array.isArray(cookie) ? cookie[0] : cookie;
}

describe("Event Editing Routes", () => {
  let staffCookie: string;
  let userCookie: string;

  beforeAll(async () => {
    staffCookie = await loginAs("staff@app.test", "password123");
    userCookie = await loginAs("user@app.test", "password123");
  });

  // ── GET /events/:eventId/edit ─────────────────────────────────────────────

  describe("GET /events/:eventId/edit", () => {
    it("returns 200 and renders the edit form for the organizer", async () => {
      const res = await request(app)
        .get("/events/evt-list-1/edit")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(200);
      expect(res.text).toContain("Edit Event");
      expect(res.text).toContain("Spring Hackathon");
    });

    it("returns 302 redirect to /login for unauthenticated users", async () => {
      const res = await request(app).get("/events/evt-list-1/edit");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/login");
    });

    it("returns 403 when a member tries to access the edit form", async () => {
      const res = await request(app)
        .get("/events/evt-list-1/edit")
        .set("Cookie", userCookie);

      expect(res.status).toBe(403);
    });

    it("returns 404 for a non-existent event", async () => {
      const res = await request(app)
        .get("/events/evt-999/edit")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(404);
    });

    it("returns 400 for a past event", async () => {
      const res = await request(app)
        .get("/events/evt-past-1/edit")
        .set("Cookie", staffCookie);

      expect(res.status).toBe(400);
    });
  });

  // ── POST /events/:eventId/edit ────────────────────────────────────────────

  describe("POST /events/:eventId/edit", () => {
    it("returns 302 redirect on successful update", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .set("Cookie", staffCookie)
        .type("form")
        .send({
          title: "Updated Hackathon",
          description: "Updated description.",
          location: "Room 202",
          category: "tech",
          startDatetime: "2025-06-01T10:00",
          endDatetime: "2025-06-01T18:00",
          capacity: "50",
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/events/evt-list-1");
    });

    it("returns 400 when title is empty", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .set("Cookie", staffCookie)
        .type("form")
        .send({
          title: "",
          description: "Some description.",
          location: "Room 101",
          category: "tech",
          startDatetime: "2025-06-01T10:00",
          endDatetime: "2025-06-01T18:00",
          capacity: "",
        });

      expect(res.status).toBe(400);
    });

    it("returns 400 when end time is before start time", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .set("Cookie", staffCookie)
        .type("form")
        .send({
          title: "Valid Title",
          description: "Some description.",
          location: "Room 101",
          category: "tech",
          startDatetime: "2025-06-01T18:00",
          endDatetime: "2025-06-01T10:00",
          capacity: "",
        });

      expect(res.status).toBe(400);
    });

    it("returns 403 when a member tries to submit the edit form", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .set("Cookie", userCookie)
        .type("form")
        .send({
          title: "Hacked",
          description: "Hacked.",
          location: "Hacked",
          category: "hacked",
          startDatetime: "2025-06-01T10:00",
          endDatetime: "2025-06-01T18:00",
          capacity: "",
        });

      expect(res.status).toBe(403);
    });

    it("returns 401 for unauthenticated POST", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .type("form")
        .send({ title: "Whatever" });

      expect(res.status).toBe(401);
    });

    it("returns 400 with error partial for HTMX invalid input request", async () => {
      const res = await request(app)
        .post("/events/evt-list-1/edit")
        .set("Cookie", staffCookie)
        .set("HX-Request", "true")
        .type("form")
        .send({
          title: "",
          description: "Some description.",
          location: "Room 101",
          category: "tech",
          startDatetime: "2025-06-01T10:00",
          endDatetime: "2025-06-01T18:00",
          capacity: "",
        });

      expect(res.status).toBe(400);
      expect(res.text).toContain("Error");
    });
  });
});