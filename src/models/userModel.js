const { query, dbType } = require('../config/database');

class UserModel {
  static async create({ name, email, password }) {
    if (dbType === 'postgres') {
      const sql = `
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at, updated_at
      `;
      const res = await query(sql, [name, email, password]);
      return res.rows[0];
    } else {
      const sql = `
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
      `;
      const res = await query(sql, [name, email, password]);
      return this.findById(res.insertId);
    }
  }

  static async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`;
    const res = await query(sql, [email]);
    return res.rows[0] || null;
  }

  static async findById(id) {
    const sql = `SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1 LIMIT 1`;
    const res = await query(sql, [id]);
    return res.rows[0] || null;
  }

  static async update(id, { name, password }) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (name) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (password) {
      fields.push(`password = $${idx++}`);
      values.push(password);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    const updatedAtField = dbType === 'postgres' 
      ? `updated_at = CURRENT_TIMESTAMP` 
      : `updated_at = datetime('now')`;
    fields.push(updatedAtField);

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`;
    await query(sql, values);

    return this.findById(id);
  }
}

module.exports = UserModel;
