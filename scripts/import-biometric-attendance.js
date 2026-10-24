require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const pool = require("../src/config/dbConnection");


// Converts the machine's date format into MySQL DATETIME format.
function parseDateTime(value) {
    const match = value.trim().match(
        /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
    );

    if (!match) {
        throw new Error(`Invalid attendance date: ${value}`);
    }

    const [, year, month, day, hour, minute, second] = match;

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// Reads and validates the biometric export.
function parseAttendanceFile(content) {
    const records = [];
    const errors = [];

    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line || /^No\s+Mchn\b/i.test(line)) {
            continue;
        }

        // The exported file is tab-separated.
        const columns = line.split(/\t+/);

        if (columns.length < 7) {
            errors.push({
                line: i + 1,
                reason: "Invalid number of columns",
            });
            continue;
        }

        const [
            recordNo,
            machineNo,
            enrollmentNo,
            machineName,
            modeCode,
            ioMode,
            dateTime,
        ] = columns;

        try {
            if (
                !/^\d+$/.test(recordNo.trim()) ||
                !/^\d+$/.test(machineNo.trim()) ||
                !/^\d+$/.test(enrollmentNo.trim()) ||
                !/^\d+$/.test(modeCode.trim()) ||
                !/^\d+$/.test(ioMode.trim())
            ) {
                throw new Error("Invalid numeric field");
            }

            records.push({
                recordNo: recordNo.trim(),
                machineNo: Number(machineNo),
                enrollmentNo: enrollmentNo.trim(),
                machineName: machineName.trim(),
                modeCode: Number(modeCode),
                ioMode: Number(ioMode),
                attendanceDateTime: parseDateTime(dateTime),
            });
        } catch (error) {
            errors.push({
                line: i + 1,
                reason: error.message,
            });
        }
    }

    return { records, errors };
}

async function importAttendance(filePath) {
    const connection = await pool.getConnection();

    try {
        // 1. Read the exported file.
        const absolutePath = path.resolve(filePath);
        const content = await fs.readFile(absolutePath, "utf8");

        const { records, errors } = parseAttendanceFile(content);

        console.log(`Valid records found: ${records.length}`);

        if (errors.length) {
            console.warn(`Malformed rows skipped: ${errors.length}`);

            for (const error of errors) {
                console.warn(
                    `Line ${error.line}: ${error.reason}`
                );
            }
        }

        if (records.length === 0) {
            console.log("No valid attendance records to import.");
            return;
        }

        // 2. Find staff using EnNo, not the machine's name.
        const enrollmentNumbers = [
            ...new Set(records.map((record) => record.enrollmentNo)),
        ];

        const placeholders = enrollmentNumbers.map(() => "?").join(", ");

        const [staffRows] = await connection.execute(
            `SELECT id, biometric_enrollment_no
             FROM staff
             WHERE biometric_enrollment_no IN (${placeholders})`,
            enrollmentNumbers
        );

        const staffByEnrollment = new Map(
            staffRows.map((staff) => [
                staff.biometric_enrollment_no,
                staff.id,
            ])
        );

        // 3. Import records atomically.
        let inserted = 0;
        let duplicates = 0;
        const unmatched = new Set();

        await connection.beginTransaction();

        try {
            for (const record of records) {
                const staffId = staffByEnrollment.get(
                    record.enrollmentNo
                );

                if (!staffId) {
                    unmatched.add(record.enrollmentNo);
                    continue;
                }

                const [result] = await connection.execute(
                    `INSERT INTO biometric_attendance (
                        staff_id,
                        person_type,
                        biometric_enrollment_no,
                        machine_no,
                        source_record_no,
                        attendance_datetime,
                        mode_code,
                        io_mode,
                        source_file
                    )
                    VALUES (?, 'staff', ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE id = id`,
                    [
                        staffId,
                        record.enrollmentNo,
                        record.machineNo,
                        record.recordNo,
                        record.attendanceDateTime,
                        record.modeCode,
                        record.ioMode,
                        path.basename(absolutePath),
                    ]
                );

                if (result.affectedRows === 1) {
                    inserted++;
                } else {
                    duplicates++;
                }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        }

        // 4. Print the import report.
        console.log("\nAttendance import completed.");
        console.log("--------------------------------");
        console.log(`Valid records processed: ${records.length}`);
        console.log(`New attendance records: ${inserted}`);
        console.log(`Duplicates skipped: ${duplicates}`);
        console.log(`Unmatched enrollment numbers: ${unmatched.size}`);

        if (unmatched.size > 0) {
            console.warn(
                "\nThese enrollment numbers were not found in staff:"
            );

            for (const enrollmentNo of unmatched) {
                console.warn(`- ${enrollmentNo}`);
            }
        }

        console.log(`Malformed rows skipped: ${errors.length}`);
    } finally {
        connection.release();
    }
}

// Accept the export file path as a command-line argument.
async function main() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error(
            "Usage: node scripts/import-biometric-attendance.js <file-path>"
        );
        process.exitCode = 1;
        return;
    }

    try {
        await importAttendance(filePath);
    } catch (error) {
        console.error("Attendance import failed:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();