const Notification = require("../models/notificationModel");
const EventEmitter = require("events");
const notificationEmitter = new EventEmitter();

// Export the emitter so other files can trigger events
exports.notificationEmitter = notificationEmitter;

exports.index = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const userId = req.userId;

  try {
    let notifications = await Notification.find({
      users: userId,
      deleted_by: { $ne: userId }
    })
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const totalCount = await Notification.countDocuments({
      users: userId,
      deleted_by: { $ne: userId }
    });

    const unreadCount = await Notification.countDocuments({
      users: userId,
      deleted_by: { $ne: userId },
      read_by: { $ne: userId }
    });

    // Determine read status for each
    notifications = notifications.map(notif => ({
      ...notif,
      is_read: notif.read_by && notif.read_by.map(id => id.toString()).includes(userId.toString())
    }));

    res.status(200).json({
      status: "success",
      count: totalCount,
      unreadCount,
      results: notifications,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications." });
  }
};

exports.markAllAsRead = async (req, res) => {
  const userId = req.userId;

  try {
    await Notification.updateMany(
      { users: userId, read_by: { $ne: userId } },
      { $push: { read_by: userId } }
    );
    res.status(200).json({ message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications as read." });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  const userId = req.userId;

  try {
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (!notification.deleted_by.includes(userId)) {
      notification.deleted_by.push(userId);
      await notification.save();
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification." });
  }
};

// SSE endpoint to subscribe to real-time notifications
exports.stream = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush the headers to establish SSE

  const userId = req.userId.toString();

  const listener = (notification) => {
    // Check if the notification is targeted for this user
    const targetUsers = notification.users.map(u => u.toString());
    if (targetUsers.includes(userId)) {
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  };

  notificationEmitter.on("new_notification", listener);

  req.on("close", () => {
    notificationEmitter.off("new_notification", listener);
  });
};
