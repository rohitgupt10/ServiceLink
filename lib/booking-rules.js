function canCancel(booking, userId) {
  return booking.status === "pending" && booking.user.toString() === userId;
}

function canConfirm(booking, providerId) {
  return booking.status === "pending" && booking.service.provider.toString() === providerId;
}

function applyCompletion(booking, userId) {
  const isCustomer = booking.user.toString() === userId;
  const isProvider = booking.service.provider.toString() === userId;
  if (booking.status !== "confirmed" || (!isCustomer && !isProvider)) return { authorized: false, complete: false };
  if (isCustomer) booking.userCompleted = true;
  if (isProvider) booking.providerCompleted = true;
  const complete = booking.userCompleted && booking.providerCompleted;
  if (complete) booking.status = "complete";
  return { authorized: true, complete };
}

module.exports = { applyCompletion, canCancel, canConfirm };
