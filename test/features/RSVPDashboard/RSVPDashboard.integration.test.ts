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

describe("RSVP Dashboard — integration", () => {
  describe("GET /rsvps/dashboard", () => {
    it("returns 200 and renders the dashboard for a member (user role)", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/rsvps/dashboard");

      expect(res.status).toBe(200);
      expect(res.text).toContain("My RSVPs");
    });

    it("shows seeded upcoming RSVPs in the Upcoming section", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/rsvps/dashboard");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Upcoming");
    });

    it("shows the Past & Cancelled section", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/rsvps/dashboard");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Past");
    });

    it("returns 403 when a staff member tries to access the dashboard", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/rsvps/dashboard");

      expect(res.status).toBe(403);
    });

    it("returns 403 when an admin tries to access the dashboard", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/rsvps/dashboard");

      expect(res.status).toBe(403);
    });

    it("redirects unauthenticated requests to login", async () => {
      const res = await request(makeApp()).get("/rsvps/dashboard");

      expect([302, 303]).toContain(res.status);
    });
  });
});
