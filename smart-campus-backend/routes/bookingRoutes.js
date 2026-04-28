const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getAllBookings,
  updateBookingStatus,
  cancelBooking
} = require("../controllers/bookingController");

// IMPORTANT: /all and /my-bookings/:userId are both GET routes on the same
// base path. Express matches routes top-to-bottom, so the static segment
// '/all' MUST be declared before the dynamic '/:id' style routes to prevent
// 'all' from being swallowed as a userId param.
router.get("/all", getAllBookings);
router.get("/my-bookings/:userId", getMyBookings);
router.post("/", createBooking);
router.put("/:id/status", updateBookingStatus);
router.put('/:id/cancel', cancelBooking);

module.exports = router;