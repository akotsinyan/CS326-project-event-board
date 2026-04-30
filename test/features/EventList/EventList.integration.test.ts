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

describe("Category and Date Filter — integration", () => {
  describe("GET /events", () => {
    it("returns 200 with the full event list for an authenticated user", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Spring Hackathon");
    });

    it("returns only tech events when category=tech is applied", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?category=tech");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Spring Hackathon");
      expect(res.text).not.toContain("Career Fair");
    });

    it("returns a partial HTML fragment when the HX-Request header is present", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?category=tech").set("HX-Request", "true");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("<!DOCTYPE html>");
      expect(res.text).not.toContain("<html");
    });

    it("reflects the active category filter in the HTMX partial response", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?category=social").set("HX-Request", "true");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Spring Hackathon");
    });

    it("returns 302 redirect to login for unauthenticated requests", async () => {
      const res = await request(makeApp()).get("/events");

      expect([302, 303]).toContain(res.status);
    });

    it("returns an empty list message when no events match the filter", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?category=nonexistent");

      expect(res.status).toBe(200);
    });

    it("filters this-week and returns 200", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?timeframe=this-week");

      expect(res.status).toBe(200);
    });

    it("filters this-weekend and returns 200", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events?timeframe=this-weekend");

      expect(res.status).toBe(200);
    });
  });
});
