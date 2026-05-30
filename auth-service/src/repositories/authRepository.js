import { getPgPool } from "@platform/shared";

const pool = getPgPool();

export class AuthRepository {
  async createOrganizationWithOwner({ organizationName, name, email, passwordHash, role }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const orgResult = await client.query(
        "INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at",
        [organizationName]
      );
      const userResult = await client.query(
        "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
        [name, email.toLowerCase(), passwordHash]
      );
      await client.query(
        "INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, $3)",
        [orgResult.rows[0].id, userResult.rows[0].id, role]
      );

      await client.query("COMMIT");
      return {
        organization: orgResult.rows[0],
        user: userResult.rows[0],
        role
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email) {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash,
        m.organization_id,
        m.role,
        o.name AS organization_name
      FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN organizations o ON o.id = m.organization_id
      WHERE u.email = $1
      LIMIT 1
      `,
      [email.toLowerCase()]
    );

    return result.rows[0] || null;
  }

  async getProfile(userId, organizationId) {
    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        m.role,
        o.id AS organization_id,
        o.name AS organization_name,
        o.billing_rate
      FROM users u
      JOIN memberships m ON m.user_id = u.id
      JOIN organizations o ON o.id = m.organization_id
      WHERE u.id = $1 AND o.id = $2
      `,
      [userId, organizationId]
    );

    return result.rows[0] || null;
  }
}

