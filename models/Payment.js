const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: "NPR", enum: ["NPR"] },
  method: { type: String, default: "dummy_card", enum: ["dummy_card"] },
  status: { type: String, default: "pending", enum: ["pending", "paid", "failed", "refunded"] },
  transactionId: { type: String, unique: true, sparse: true },
  last4: { type: String, default: "" },
  failureReason: { type: String, default: "" },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
}, { timestamps: true });

paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
