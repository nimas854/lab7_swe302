export function validateStudentId(id) {
  if (!id) return { valid: false, message: 'Student ID is required.' };
  if (!/^\d{8}$/.test(id)) {
    return { valid: false, message: 'Student ID must contain exactly 8 digits.' };
  }
  return { valid: true, message: 'Valid student ID.' };
}

export function validatePassword(password) {
  if (!password) return { valid: false, message: 'Password is required.' };
  if (password.length < 8 || password.length > 12) {
    return { valid: false, message: 'Password must be 8 to 12 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include an uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include a lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include a number.' };
  }
  return { valid: true, message: 'Valid password.' };
}

export function validatePaymentScreenshot(fileName) {
  if (!fileName) return { valid: false, message: 'Payment screenshot is required.' };
  if (!/\.(jpg|jpeg|png)$/i.test(fileName)) {
    return { valid: false, message: 'Only JPG, JPEG, and PNG files are allowed.' };
  }
  return { valid: true, message: 'Valid payment screenshot.' };
}

export function validateTransactionNumber(value) {
  if (!value) return { valid: false, message: 'Transaction number is required.' };
  if (!/^\d{3}-\d{9}$/.test(value)) {
    return { valid: false, message: 'Use the format 123-123456789.' };
  }
  return { valid: true, message: 'Valid transaction number.' };
}
