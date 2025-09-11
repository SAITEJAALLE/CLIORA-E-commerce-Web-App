// node server/scripts/resetAdmin.mjs "email" "newPassword"
import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

if (process.argv.length < 4) {
  console.error('Usage: node scripts/resetAdmin.mjs "email" "newPassword"');
  process.exit(1);
}

const email = String(process.argv[2]).trim().toLowerCase();
const newPass = String(process.argv[3]);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (!rows[0]) {
      console.log('No user found with that email. Creating admin...');
      const hash = await bcrypt.hash(newPass, 10);
      const ins = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1,$2,$3,'admin') RETURNING id, email, role`,
        ['Admin', email, hash]
      );
      console.log('Created:', ins.rows[0]);
    } else {
      console.log('User found. Updating password...');
      const hash = await bcrypt.hash(newPass, 10);
      const upd = await pool.query(
        `UPDATE users SET password_hash=$1, role=$2 WHERE LOWER(email)=LOWER($3)
         RETURNING id, email, role`,
        [hash, 'admin', email]
      );
      console.log('Updated:', upd.rows[0]);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
})();
