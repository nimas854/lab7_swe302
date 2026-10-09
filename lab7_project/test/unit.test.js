import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStudentId, validatePassword, validatePaymentScreenshot, validateTransactionNumber } from '../src/validation.js';
import { verifyPayment, registrationDecision, canViewResults } from '../src/registration.js';

test('R1/R2 valid student ID', () => assert.equal(validateStudentId('02240358').valid, true));
test('R1 empty student ID', () => assert.equal(validateStudentId('').valid, false));
test('R2 seven digits', () => assert.equal(validateStudentId('0224035').valid, false));
test('R2 nine digits', () => assert.equal(validateStudentId('022403589').valid, false));
test('R2 letters not allowed', () => assert.equal(validateStudentId('0223ABCD').valid, false));

test('R3/R4 valid password', () => assert.equal(validatePassword('Pass8068').valid, true));
test('R3 empty password', () => assert.equal(validatePassword('').valid, false));
test('R4 too short', () => assert.equal(validatePassword('Pass806').valid, false));
test('R4 too long', () => assert.equal(validatePassword('Pass806806806').valid, false));
test('R4 missing uppercase', () => assert.equal(validatePassword('password806').valid, false));
test('R4 missing lowercase', () => assert.equal(validatePassword('PASSWORD806').valid, false));
test('R4 missing number', () => assert.equal(validatePassword('Password').valid, false));

test('R6 JPG accepted', () => assert.equal(validatePaymentScreenshot('receipt.jpg').valid, true));
test('R6 JPEG accepted', () => assert.equal(validatePaymentScreenshot('receipt.jpeg').valid, true));
test('R6 PNG accepted', () => assert.equal(validatePaymentScreenshot('receipt.png').valid, true));
test('R6 invalid type rejected', () => assert.equal(validatePaymentScreenshot('receipt.pdf').valid, false));
test('R6 missing file rejected', () => assert.equal(validatePaymentScreenshot('').valid, false));

test('R7 valid transaction', () => assert.equal(validateTransactionNumber('123-123456789').valid, true));
test('R7 missing transaction', () => assert.equal(validateTransactionNumber('').valid, false));
test('R7 missing hyphen', () => assert.equal(validateTransactionNumber('123123456789').valid, false));
test('R7 wrong first segment', () => assert.equal(validateTransactionNumber('1234-123456789').valid, false));
test('R7 too long', () => assert.equal(validateTransactionNumber('123-1234567890').valid, false));

test('R8 payment verified and complete generates receipt', () => assert.deepEqual(verifyPayment(true, true), { verified:true, receiptGenerated:true, complete:true }));
test('R9 payment unverified remains incomplete', () => assert.equal(verifyPayment(false, true).complete, false));
test('R9 upload incomplete remains incomplete', () => assert.equal(verifyPayment(true, false).complete, false));

test('Registration allowed when all conditions pass', () => assert.equal(registrationDecision({tuitionVerified:true, drugTestVerified:true, registrationOpen:true, alreadyRegistered:false}).allowed, true));
test('Registration rejected when tuition not verified', () => assert.equal(registrationDecision({tuitionVerified:false, drugTestVerified:true, registrationOpen:true, alreadyRegistered:false}).message, 'Tuition payment not verified.'));
test('Registration rejected when drug test not verified', () => assert.equal(registrationDecision({tuitionVerified:true, drugTestVerified:false, registrationOpen:true, alreadyRegistered:false}).message, 'Drug testing report not verified.'));
test('Registration rejected when period closed', () => assert.equal(registrationDecision({tuitionVerified:true, drugTestVerified:true, registrationOpen:false, alreadyRegistered:false}).message, 'Registration period is closed.'));
test('Duplicate module rejected', () => assert.equal(registrationDecision({tuitionVerified:true, drugTestVerified:true, registrationOpen:true, alreadyRegistered:true}).message, 'Module registration already exists.'));

test('Registered student can view results', () => assert.equal(canViewResults(true), true));
test('Unregistered student cannot view results', () => assert.equal(canViewResults(false), false));
