export function verifyPayment(paymentVerified, uploadComplete) {
  if (paymentVerified && uploadComplete) {
    return { verified: true, receiptGenerated: true, complete: true };
  }
  return { verified: false, receiptGenerated: false, complete: false };
}

export function registrationDecision({ tuitionVerified, drugTestVerified, registrationOpen, alreadyRegistered }) {
  if (alreadyRegistered) {
    return { allowed: false, message: 'Module registration already exists.' };
  }
  if (!tuitionVerified) {
    return { allowed: false, message: 'Tuition payment not verified.' };
  }
  if (!drugTestVerified) {
    return { allowed: false, message: 'Drug testing report not verified.' };
  }
  if (!registrationOpen) {
    return { allowed: false, message: 'Registration period is closed.' };
  }
  return { allowed: true, message: 'Registration successful!' };
}

export function canViewResults(isRegistered) {
  return Boolean(isRegistered);
}
