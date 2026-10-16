const express = require("express")
const { getStaff } = require("./staff.controller")
const router = express.Router()

router.get("/staff", getStaff)
module.exports = router;