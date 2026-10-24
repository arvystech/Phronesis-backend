const connection = require("../../config/dbConnection");

const createStaff = async (staffData) => {


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

    const [result] = await connection.query(
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
        ]
    );
    return result.insertId;
}

const getStaffById = async (id) => {
    const [rows] = await connection.query(`SELECT * FROM staff WHERE id = ?`, [id])
    return rows[0] || null
}

const getAllStaff = async () => {
    const [rows] = await connection.query(`SELECT * FROM staff`)
    return rows
}

const getStaffAttendance = async () => {
    try {
        const [rows] = await connection.query(`SELECT ba.*, s.first_name, s.last_name, 
            s.email, s.phone, s.department 
            FROM biometric_attendance ba
            JOIN staff s
            ON ba.staff_id = s.id`)
        return rows
    } catch (error) {
        console.error("[admin.model] Error in getStaffAttendance:", error);
        return null;
    }
}
module.exports = { createStaff, getStaffById, getAllStaff, getStaffAttendance };