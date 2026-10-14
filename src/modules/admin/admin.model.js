const connection = require("../../config/dbConnection");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

async function createAdmin(email, password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    return new Promise((resolve, reject) => {
        connection.query(
            `INSERT INTO admin (email, password) VALUES (?, ?)`,
            [email, hashedPassword],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
}

function getAdminById(adminId) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT admin_id, email FROM admin WHERE admin_id = ?`,
            [adminId],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows[0] || null);
            }
        );
    });
}

// For login: needs the hash, so only use this internally for auth
function getAdminByEmail(email) {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT admin_id, email, password FROM admin WHERE email = ?`,
            [email],
            (err, rows) => {
                if (err) return reject(err);
                resolve(rows[0] || null);
            }
        );
    });
}

module.exports = { createAdmin, getAdminById, getAdminByEmail };