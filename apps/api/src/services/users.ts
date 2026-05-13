import type { D1Database } from "@cloudflare/workers-types";

export type UserRole = "student" | "teacher";

export type UserRow = {
  user_id: string;
  email_domain: string;
  role: UserRole;
  created_at: number;
  last_seen_at: number;
};

export async function upsertUser(
  db: D1Database,
  args: { userId: string; emailDomain: string },
): Promise<UserRow> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (user_id, email_domain, role, created_at, last_seen_at)
       VALUES (?1, ?2, 'student', ?3, ?3)
       ON CONFLICT(user_id) DO UPDATE SET last_seen_at = ?3`,
    )
    .bind(args.userId, args.emailDomain, now)
    .run();

  const row = await db
    .prepare(`SELECT * FROM users WHERE user_id = ?1`)
    .bind(args.userId)
    .first<UserRow>();

  if (!row) {
    throw new Error("upsertUser: user row missing after insert");
  }
  return row;
}
