const connection = require("../../config/dbConnection");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 12;

const createAdmin = async (email, password) => {
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

const getAdminById = async (adminId) => {
    try {
        const [rows] = await connection.query(`SELECT * FROM admin WHERE admin_id = ?`, [adminId])
        return rows[0] || null
    } catch (error) {
        console.error("[admin.model] Error in getAdminById:", error);
        return null;
    }
}

// For login: needs the hash, so only use this internally for auth
const getAdminByEmail = async (email) => {
    try {
        const [rows] = await connection.query(`SELECT * FROM admin WHERE email = ?`, [email])
        return rows[0] || null
    } catch (error) {
        console.error("[admin.model] Error in getAdminByEmail:", error);
        return null;
    }
}


module.exports = { createAdmin, getAdminById, getAdminByEmail, };