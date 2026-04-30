import request from "supertest";
import { createComposedApp } from "../../../src/composition";

function makeApp() {
  return createComposedApp().getExpressApp();
}

async function loginAs(agent: ReturnType<typeof request.agent>, email: string) {
  await agent
    .post("/login")
    .type("form")
    .send({ email, password: "password123" })
    .expect(302);
}

describe("Event Publishing — integration", () => {
  describe("POST /events/:eventId/publish", () => {
    it("redirects when staff publishes their own draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-draft-1/publish");

      expect([302, 303]).toContain(res.status);
    });

    it("returns 404 when the event does not exist", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-does-not-exist/publish");

      expect(res.status).toBe(404);
    });

    it("returns 400 when trying to publish an already-published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-list-1/publish");

      expect(res.status).toBe(400);
    });

    it("returns 403 when a member (user role) tries to publish", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.post("/events/evt-draft-1/publish");

      expect(res.status).toBe(403);
    });

    it("redirects when admin publishes any draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.post("/events/evt-draft-1/publish");

      expect([302, 303]).toContain(res.status);
    });

    it("returns 401 when not logged in", async () => {
      const res = await request(makeApp()).post("/events/evt-draft-1/publish");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /events/:eventId/cancel", () => {
    it("redirects when staff cancels their own published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-list-1/cancel");

      expect([302, 303]).toContain(res.status);
    });

    it("returns 400 when trying to cancel a draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-draft-1/cancel");

      expect(res.status).toBe(400);
    });

    it("returns 404 when the event does not exist", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.post("/events/evt-does-not-exist/cancel");

      expect(res.status).toBe(404);
    });

    it("allows admin to cancel any published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.post("/events/evt-list-2/cancel");

      expect([302, 303]).toContain(res.status);
    });

    it("returns 403 when a member (user role) tries to cancel", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.post("/events/evt-list-1/cancel");

      expect(res.status).toBe(403);
    });

    it("returns 401 when not logged in", async () => {
      const res = await request(makeApp()).post("/events/evt-list-1/cancel");

      expect(res.status).toBe(401);
    });
  });
});
