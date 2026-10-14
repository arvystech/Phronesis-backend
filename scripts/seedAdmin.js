require("dotenv").config();
const connection = require("./../src/config/dbConnection");
const { createAdmin } = require("./../src/modules/admin/admin.model"); // adjust path

async function seed() {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD");
    }
    if (password.length < 6 || password.length > 72) {
        throw new Error("Password must be 12-72 characters");
    }

    await createAdmin(email, password);
    console.log(`Admin created: ${email}`);
}

seed()
    .catch((err) => {
        if (err.code === "ER_DUP_ENTRY") {
            console.error("An admin with that email already exists");
        } else {
            console.error(err);
        }
        process.exitCode = 1;
    })
    .finally(() => connection.end());