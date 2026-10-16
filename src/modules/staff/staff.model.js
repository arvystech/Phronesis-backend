const connection = require("../../config/dbConnection");

function createStaff(staffData) {


    const {
        staff_no,
        first_name,
        last_name,
        other_names,
        biometric_enrollment_no,
        email,
        phone,
        department,
    } = staffData;

    return new Promise((resolve, reject) => {
        connection.query(
            `INSERT INTO staff
                (staff_no, first_name, last_name, other_names,
                 biometric_enrollment_no, email, phone, department)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                staff_no,
                first_name,
                last_name,
                other_names,
                biometric_enrollment_no,
                email,
                phone,
                department,
            ],
            (err, result) => {
                if (err) return reject(err);
                resolve(result.insertId);
            },
        );
    });
}

function getStaffById(id) {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM staff WHERE id = ?`, [id], (err, rows) => {
            if (err) return reject(err);
            resolve(rows[0] || null);
        });
    });
}

function getAllStaff() {
    return new Promise((resolve, reject) => {
        connection.query(`SELECT * FROM staff`, (err, rows) => {
            if (err) reject(err)
            resolve(rows)
        })
    })
}

module.exports = { createStaff, getStaffById, getAllStaff };