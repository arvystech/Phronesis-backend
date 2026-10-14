const adminModel = require("../admin/admin.model")

const getAdminDashboard = async (req, res) => {

    try {
        const adminId = req.user.id
        const admin = await adminModel.getAdminById(adminId)

        if (!admin) {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                title: "Admin Not Found",
                message: "We could not find this admin record.",
            });
        }

        res.json({
            success: true,
            pageTitle: "Admin Dashboard",
            user: admin,
            role: "Admin",
        })
    } catch (err) {
        console.error("[adminController] Error in getAdminDashboard:", err);
        res.status(500).json({
            success: false,
            statusCode: 500,
            title: "Something Went Wrong",
            message: "We encountered an error loading your dashboard data.",
        });
    }
}

module.exports = { getAdminDashboard }