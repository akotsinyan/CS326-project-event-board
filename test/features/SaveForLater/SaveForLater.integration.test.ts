import { beforeEach, afterAll, describe, expect, it } from "@jest/globals";
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

describe("SaveForLater routes e2e tests", () => {
  it("POST /events/:eventId/save returns 401 when not logged in", async () => {
    const app = makeApp();
    const response = await request(app).post("/events/evt-1/save");

    expect(response.status).toBe(401);
  });

  it("POST /events/:eventId/save toggles save state and returns updated button", async () => {
    const agent = request.agent(makeApp());
    await loginAs(agent, "user@app.test");

    const response = await agent.post("/events/evt-list-1/save");

    expect(response.status).toBe(200);
    expect(response.text).toContain("save");
  });

  it("GET /saved renders saved events page for authenticated user", async () => {
    const agent = request.agent(makeApp());
    await loginAs(agent, "user@app.test");

    await agent.post("/events/evt-list-1/save");

    const response = await agent.get("/saved");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Saved Events");
  });

  it("GET /saved returns 302 redirect when not authenticated", async () => {
    const app = makeApp();
    const response = await request(app).get("/saved");

    expect(response.status).toBe(302);
    expect(response.headers.location).toContain("/login");
  });
});
