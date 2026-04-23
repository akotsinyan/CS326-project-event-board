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

describe("PastEventArchiving — integration", () => {
  describe("GET /events/archive", () => {
    it("redirects unauthenticated users to login", async () => {
      const res = await request(makeApp()).get("/events/archive");
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("/login");
    });

    it("returns 200 and renders the archive page for an authenticated user", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/archive");

      expect(res.status).toBe(200);
    });

    it("displays seeded past events in the archive", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/archive");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Winter Networking Mixer");
      expect(res.text).toContain("Resume Workshop");
    });

    it("returns 200 for admin users viewing the archive", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events/archive");

      expect(res.status).toBe(200);
    });

    it("returns 200 for staff users viewing the archive", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/archive");

      expect(res.status).toBe(200);
    });
  });
});
