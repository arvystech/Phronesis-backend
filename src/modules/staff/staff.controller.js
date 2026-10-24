const { createStaff, getStaffById, getAllStaff, getStaffAttendance } = require("../staff/staff.model")
const { validateCreateStaff } = require("../../validators/staffValidator")

async function addStaff(req, res) {
    const { errors, data, isValid } = validateCreateStaff(req.body);

    if (!isValid) {
        return res.status(400).json({ message: "Validation failed", errors });
    }

    try {
        const id = await createStaff(data);
        const staff = await getStaffById(id);
        return res.status(201).json({ message: "Staff created", staff });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            const msg = err.sqlMessage || "";
            let field = "a unique field";
            if (msg.includes("staff_no")) field = "staff number";
            else if (msg.includes("biometric_enrollment_no")) field = "biometric enrollment number";
            else if (msg.includes("email")) field = "email";

            return res.status(409).json({ message: `A staff member with this ${field} already exists` });
        }
        console.error(err);
        return res.status(500).json({ message: "Something went wrong" });
    }
}

const getStaff = async (req, res) => {
    try {
        const staff = await getAllStaff()
        return res.status(200).json({
            success: true,
            staff
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ message: "Something went wrong" })
    }
}

const staffAttendance = async (req, res) => {
    try {
        const staffAttendance = await getStaffAttendance()
        res.json({
            success: true,
            data: staffAttendance,
        })
    } catch (error) {
        console.error("[adminController] Error in getStaffAttendance:", error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            title: "Something Went Wrong",
            message: "We encountered an error loading staff attendance data.",
        });
    }
}
module.exports = { addStaff, getStaff, staffAttendance };