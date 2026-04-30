import request from "supertest";
import { createComposedApp } from "../../../src/composition";

function makeApp() {
  return createComposedApp("memory").getExpressApp();
}

async function loginAs(agent: ReturnType<typeof request.agent>, email: string) {
  await agent
    .post("/login")
    .type("form")
    .send({ email, password: "password123" })
    .expect(302);
}

function makeEvent(overrides = {}) {
  return {
    title: "Test Event",
    description: "A description",
    location: "Room 1",
    category: "tech",
    capacity: null,
    startDatetime: "2023-10-10T10:00",
    endDatetime: "2023-10-11T12:00",
    ...overrides,
  };
}

describe("Create And Search Event — integration", () => {
  describe("GET /events/new", () => {
    it("renders the create event page for admin users", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events/new");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Create Event");
    });

    it("redirects unauthenticated users to login", async () => {
      const agent = request.agent(makeApp());

      const res = await agent.get("/events/new");

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/login");
    });

    it("returns 403 for public users", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/new");

      expect(res.status).toBe(403);
    });
  });

  describe("POST /events/new", () => {
    it("creates a new event and redirects to the event details for admin users", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      let res = await agent.post("/events/new").type("form").send(makeEvent());
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/events/");

      res = await agent.post("/events/new").type("form").send(makeEvent({ capacity: 1}));
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/events/");
    });

    it("returns validation errors for invalid input", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const testInputs = [
        { title: "" },
        { description: "" },
        { location: "" },
        { startDatetime: "" },
        { endDatetime: "" },
        { startDatetime: "2023-10-10T10:00", endDatetime: "2023-10-09T12:00" },
        { startDatetime: "invalid-date", endDatetime: "2023-10-09T12:00" },
        { startDatetime: "2023-10-08T10:00", endDatetime: "invalid-date" },
        { capacity: "not-a-number" },
        { capacity: -5 },
      ];

      for (const input of testInputs) {
        const res = await agent.post("/events/new").type("form").send(makeEvent(input));
        expect(res.status).toBe(400);
      }
    });

    it("returns 403: Forbidden for public users", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.post("/events/new").type("form").send(makeEvent());

      expect(res.status).toBe(403);
    });

    it("returns 401: Unauthorized for unauthenticated users", async () => {
      const agent = request.agent(makeApp());

      const res = await agent.post("/events/new").type("form").send(makeEvent());

      expect(res.status).toBe(401);
    });
  });

  describe("GET /events", () => {
    it("filters based on event title", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events").query({ q: "Spring Hackathon" });

      expect(res.status).toBe(200);
      expect(res.text).toContain("Spring Hackathon");
    });

    it("filters based on event description", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events").query({ q: "Meet recruiters and hiring managers from top companies" });

      expect(res.status).toBe(200);
      expect(res.text).toContain("Career Fair");
    });

    it("filters based on event location", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events").query({ q: "Main Hall" });

      expect(res.status).toBe(200);
      expect(res.text).toContain("Career Fair");
      expect(res.text).toContain("Main Hall");
    });

    it("returns an empty list message when no events match the search query", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events").query({ q: "Non-existent-Event" });

      expect(res.status).toBe(200);
      expect(res.text).toContain("No events match your filters.");
    });

    it("returns 200 with the full event list when search query is empty or all whitespace", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events").query({ q: "   " });

      expect(res.status).toBe(200);
    });
  });
});
