import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, type TestDatabase } from "./test-database";

describe("db sync against a real database", () => {
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await createTestDatabase();
  });

  afterAll(async () => {
    await testDb?.drop();
  });

  it("keeps existing rows when the schema hash changes", async () => {
    expect(testDb.sync().status).toBe(0);

    const { client } = testDb;
    await client.query(
      `UPDATE "user" SET name = 'edited by hand' WHERE email = 'student@unmsm.edu.pe'`,
    );
    await client.query(`ALTER TABLE "user" DROP COLUMN total_donations`);
    await client.query(`UPDATE schema_integrity SET schema_hash = 'stale'`);

    const result = testDb.sync();
    expect(result.status, result.output).toBe(0);

    const rows = await client.query(
      `SELECT name, total_donations FROM "user" WHERE email = 'student@unmsm.edu.pe'`,
    );
    expect(rows.rows).toEqual([{ name: "edited by hand", total_donations: "0" }]);
  }, 120_000);

  it("stops, and records nothing, when the schema change would lose data", async () => {
    const { client } = testDb;
    await client.query(`ALTER TABLE "user" ADD COLUMN scratch int`);
    await client.query(`UPDATE "user" SET scratch = 7`);
    await client.query(`UPDATE schema_integrity SET schema_hash = 'stale', seed_hash = 'stale'`);

    const result = testDb.sync();

    expect(result.status, result.output).not.toBe(0);
    expect(result.output).toContain("scratch");
    expect(result.output).not.toContain("Seeding");
    const hashes = await client.query(`SELECT schema_hash, seed_hash FROM schema_integrity`);
    expect(hashes.rows).toEqual([{ schema_hash: "stale", seed_hash: "stale" }]);
    const kept = await client.query(`SELECT DISTINCT scratch FROM "user"`);
    expect(kept.rows).toEqual([{ scratch: 7 }]);
  }, 120_000);

  it("leaves tables it does not manage alone", async () => {
    const { client } = testDb;
    await client.query(`ALTER TABLE "user" DROP COLUMN scratch`);
    await client.query(`CREATE TABLE hand_made (x int)`);
    await client.query(`INSERT INTO hand_made VALUES (1)`);
    await client.query(`UPDATE schema_integrity SET schema_hash = 'stale'`);

    const result = testDb.sync();

    expect(result.status, result.output).not.toBe(0);
    const rows = await client.query(`SELECT x FROM hand_made`);
    expect(rows.rows).toEqual([{ x: 1 }]);
  }, 120_000);
});
