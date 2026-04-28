const Booking = require("../models/Booking");
const User    = require("../models/User");

// ── Helper: resolve custom userId string → Mongo User document ──────────────
const resolveUser = async (userId, res) => {
  const user = await User.findOne({ userId });
  if (!user) {
    res.status(404).json({ message: `No user found with userId '${userId}'.` });
    return null;
  }
  return user;
};

// ── Helper: "HH:MM" string → comparable integer (e.g. "09:30" → 570) ───────
const timeToMinutes = (t = "") => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// ───────────────────────────────────────────────────────────────────────────
// @route   POST /api/bookings
// ───────────────────────────────────────────────────────────────────────────
const createBooking = async (req, res) => {
  const { userId, resourceId, date, startTime, endTime, reason } = req.body;

  if (!userId || !resourceId || !date || !startTime || !endTime) {
    return res.status(400).json({
      message: "userId, resourceId, date, startTime, and endTime are all required.",
    });
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return res.status(400).json({ message: "endTime must be after startTime." });
  }

  try {
    const user = await resolveUser(userId, res);
    if (!user) return;

    // This conflict check already naturally ignores "cancelled" status!
    const conflict = await Booking.findOne({
      resource: resourceId,
      date,
      status: { $in: ["approved", "pending"] },
      startTime: { $lt: endTime   }, 
      endTime:   { $gt: startTime }, 
    });

    if (conflict) {
      return res.status(400).json({
        message: "This room is already booked or requested for this time. " +
                 `Conflict with an existing ${conflict.status} booking (${conflict.startTime}–${conflict.endTime}).`,
      });
    }

    const booking = new Booking({
      user:      user._id,
      resource:  resourceId,
      date,
      startTime,
      endTime,
      reason:    reason || "",
    });

    const saved = await booking.save();

    return res.status(201).json({
      message: "Booking created successfully.",
      booking: saved,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "resourceId is not a valid MongoDB ObjectId." });
    }
    console.error("createBooking error:", error);
    return res.status(500).json({ message: "Server error while creating booking." });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// @route   GET /api/bookings/my-bookings/:userId
// ───────────────────────────────────────────────────────────────────────────
const getMyBookings = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await resolveUser(userId, res);
    if (!user) return;

    const bookings = await Booking.find({ user: user._id })
      .populate("resource", "name type floor capacity")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: bookings.length, bookings });
  } catch (error) {
    console.error("getMyBookings error:", error);
    return res.status(500).json({ message: "Server error while fetching your bookings." });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// @route   GET /api/bookings/all
// ───────────────────────────────────────────────────────────────────────────
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user",     "name role userId")
      .populate("resource", "name floor type capacity")
      .sort({ createdAt: -1 });

    // Added 'cancelled' to the sorting order
    const STATUS_ORDER = { pending: 0, approved: 1, rejected: 2, cancelled: 3 };
    const sorted = [...bookings].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    );

    return res.status(200).json({ count: sorted.length, bookings: sorted });
  } catch (error) {
    console.error("getAllBookings error:", error);
    return res.status(500).json({ message: "Server error while fetching all bookings." });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// @route   PUT /api/bookings/:id/status
// ───────────────────────────────────────────────────────────────────────────
const updateBookingStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  const VALID_STATUSES = ["approved", "rejected"];
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      message: `'status' must be one of: ${VALID_STATUSES.join(", ")}.`,
    });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: `No booking found with id '${id}'.` });
    }

    booking.status = status;
    const updated  = await booking.save();

    return res.status(200).json({
      message: `Booking has been ${status}.`,
      booking: updated,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Booking id is not a valid MongoDB ObjectId." });
    }
    console.error("updateBookingStatus error:", error);
    return res.status(500).json({ message: "Server error while updating booking status." });
  }
};

// ───────────────────────────────────────────────────────────────────────────
// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel a booking (User action)
// ───────────────────────────────────────────────────────────────────────────
const cancelBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: `No booking found with id '${id}'.` });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "This booking is already cancelled." });
    }

    booking.status = "cancelled";
    const updated = await booking.save();

    return res.status(200).json({
      message: "Booking cancelled successfully.",
      booking: updated,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "Booking id is not a valid MongoDB ObjectId." });
    }
    console.error("cancelBooking error:", error);
    return res.status(500).json({ message: "Server error while cancelling booking." });
  }
};

module.exports = { createBooking, getMyBookings, getAllBookings, updateBookingStatus, cancelBooking };