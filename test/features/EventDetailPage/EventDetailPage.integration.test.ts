import { describe, expect, it } from "@jest/globals";
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

describe("EventDetailPage — integration", () => {
  describe("Published events", () => {
    it("returns 200 for any authenticated user viewing a published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Event Details");
    });

    it("shows RSVP button for members on published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("rsvp");
    });

    it("shows save button for members on published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("save");
    });

    it("does not show publish/cancel controls for members on published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Publish");
      expect(res.text).not.toContain("Cancel Event");
    });
  });

  describe("Missing events", () => {
    it("returns 404 for non-existent event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-does-not-exist");

      expect(res.status).toBe(404);
      expect(res.text).toContain("not found");
    });
  });

  describe("Draft visibility rule", () => {
    it("allows organizer to view their own draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Event Details");
    });

    it("allows admin to view any draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Event Details");
    });

    it("prevents member from viewing draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(404);
      expect(res.text).toContain("not found");
    });

    it("prevents non-owner staff from viewing draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-draft-2");

      expect(res.status).toBe(404);
      expect(res.text).toContain("not found");
    });

    it("organizer sees publish control on draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Publish");
    });

    it("organizer does not see cancel control on draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Cancel Event");
    });
  });

  describe("Edit controls", () => {
    it("organizer sees edit button on their event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Edit");
    });

    it("admin sees edit button on any draft event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events/evt-draft-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Edit");
    });

    it("member does not see edit button", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Edit");
    });
  });

  describe("Cancel controls", () => {
    it("organizer sees cancel button on published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "staff@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Cancel Event");
    });

    it("admin sees cancel button on published event", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "admin@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).toContain("Cancel Event");
    });

    it("member does not see cancel button", async () => {
      const agent = request.agent(makeApp());
      await loginAs(agent, "user@app.test");

      const res = await agent.get("/events/evt-list-1");

      expect(res.status).toBe(200);
      expect(res.text).not.toContain("Cancel Event");
    });
  });
});
