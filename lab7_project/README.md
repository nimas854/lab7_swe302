# CST Student Management System - Lab 7 (usability test version)

The system has a Node.js backend. It needs no extra packages, only Node.js 18 or newer.

## Run
In this folder, run:

    npm start

Then open http://localhost:3000 in the browser.
The student, teacher and admin can use different computers if they open the address of the computer that runs the server (for example http://192.168.1.10:3000).

## Accounts
Student login (Student Login tab)
- Student ID: 02240358
- Password: Student123

Staff login (Staff Login tab)
- Admin: admin01 / Admin1234
- Teacher T001 (Karma Dorji, authorised): T001 / Teacher123
- Teachers T002 and T003 start as not authorised. The admin must authorise them first. Password for both: Teacher123

## What each role can do
- Student: log in, see the dashboard, submit a tuition payment with a screenshot, request a module registration, view results and download them as a PDF.
- Teacher: view the payment screenshot, verify or reject payments, approve or reject module registration requests. A registration can only be approved after the student's payment is verified.
- Admin: authorise or remove teachers, and reset the test data.

## Files
- server.js - the backend (login, payments, registrations, results, admin)
- index.html - the web pages
- src/validation.js and src/registration.js - the rules, used by the server and checked by the unit tests
- data.json - saved data, created when the server first starts
- uploads/ - payment screenshots, created automatically

## Test data
Log in as admin and press Reset Test Data before each new test. It also deletes the uploaded screenshots.
The test student starts with an approved SWE302 registration, so results can be viewed.
To start completely fresh, stop the server and delete data.json and the uploads folder.

## Unit tests (from Lab 2, still passing)
    npm test
