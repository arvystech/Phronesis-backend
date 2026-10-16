const validator = require("validator");

const DEPARTMENTS = ["Teaching", "Non-Teaching"];

const isBlank = (value) =>
    value === undefined || value === null || (typeof value === "string" && value.trim() === "");

function validateCreateStaff(body = {}) {
    const errors = {};
    const data = {};

    // Compulsory text fields: [key, label, max length]
    const required = [
        ["staff_no", "Staff number", 30],
        ["first_name", "First name", 100],
        ["last_name", "Last name", 100],
        ["biometric_enrollment_no", "Biometric enrollment number", 20],
    ];

    for (const [key, label, max] of required) {
        const raw = body[key];
        if (isBlank(raw)) {
            errors[key] = `${label} is required`;
        } else if (typeof raw !== "string") {
            errors[key] = `${label} must be text`;
        } else if (raw.trim().length > max) {
            errors[key] = `${label} must be at most ${max} characters`;
        } else {
            data[key] = raw.trim();
        }
    }

    // Compulsory: phone
    if (isBlank(body.phone)) {
        errors.phone = "Phone number is required";
    } else if (typeof body.phone !== "string" || !/^\+?[0-9\s-]{7,20}$/.test(body.phone.trim())) {
        errors.phone = "Phone number is invalid";
    } else {
        data.phone = body.phone.trim();
    }

    // Compulsory: department
    if (isBlank(body.department)) {
        errors.department = "Department is required";
    } else if (!DEPARTMENTS.includes(String(body.department).trim())) {
        errors.department = `Department must be one of: ${DEPARTMENTS.join(", ")}`;
    } else {
        data.department = String(body.department).trim();
    }

    // Optional: other names
    if (isBlank(body.other_names)) {
        data.other_names = null;
    } else if (typeof body.other_names !== "string" || body.other_names.trim().length > 150) {
        errors.other_names = "Other names must be text of at most 150 characters";
    } else {
        data.other_names = body.other_names.trim();
    }

    // Optional: email (but must be valid if provided)
    if (isBlank(body.email)) {
        data.email = null;
    } else if (
        typeof body.email !== "string" ||
        body.email.trim().length > 150 ||
        !validator.isEmail(body.email.trim())
    ) {
        errors.email = "Email is invalid";
    } else {
        data.email = body.email.trim().toLowerCase();
    }

    return { errors, data, isValid: Object.keys(errors).length === 0 };
}


module.exports = { validateCreateStaff };