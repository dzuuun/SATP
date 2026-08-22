# How to Check Student Transactions in SATP

Notre Dame of Marbel University  
Student Assessment of Teacher's Performance

Version: August 22, 2026

## 1. About SATP

This guide explains how an authorized user can open SATP from the landing page and check students' course-assessment transactions. The account must have **Transactions** permission. Pages that are not permitted for the signed-in role are hidden from the sidebar.

Production SATP website: https://satp.ndmu.edu.ph/

1. Open https://satp.ndmu.edu.ph/.
2. On the landing page, select **Log in to SATP**.

## 2. Signing in and out

1. On the SATP login page, sign in using either:
   - The assigned SATP username and password; or
   - **Sign in with Google** using the institutional email linked to the SATP account.
2. Wait for SATP to open the first page permitted for the account.
3. If sign-in fails, verify the credentials and account status or contact the MIS Department.

For Google login, the institutional email must already be linked to an active SATP account. An account without Transactions permission cannot open the Transactions module.

## 3. Open the Transactions module

1. In the left sidebar, select **Transactions**.
2. If the sidebar is collapsed, select the hamburger button in the header to open it.
3. Confirm that the Transactions workspace appears.

If **Transactions** is missing, ask an authorized administrator to review the account's permission role.

## 4. Transactions

### Select the academic period

1. Select the required **School year**.
2. Select the required **Semester** or term.
3. Select **Load students** when the page requires it.
4. Wait for the student table to finish loading.

SATP loads the current academic period by default. College and SHS may have different active periods, and SHS supports three terms. Always verify the displayed period before interpreting the results.

### Find a student

1. Enter the student's ID number in the table search box. The student ID number is the student's SATP username.
2. Alternatively, search using the student's displayed name.
3. Use the table pagination controls if more results are available.
4. Confirm the correct student and Program before opening the record.

### Open a student's transaction details

1. After the transaction records finish loading, locate the student using the search box or table pagination.
2. Confirm the student's ID number, name, Program, total Courses, and completion status.
3. Select anywhere on the student's table row. The **Student courses** transaction-detail modal opens automatically.

The table row itself is the view action; there is no separate View button.

### Review the student's transactions

1. Select the student's view/detail action.
2. Review the list of assigned Courses and teachers.
3. Check the status of each Course:
   - **Rated** means the student successfully submitted an assessment for that teacher and Course.
   - **Pending** means an assessment is still awaiting submission.
4. Use the modal pagination controls when the student has several Courses.
5. Select **Close** when finished.

Teacher names are intentionally hidden in this manual's screenshots for privacy. The live SATP modal displays the assigned teacher for each Course.

For CHS students, one schedule code may contain several teachers. Each teacher is a separate rating opportunity and therefore appears as a separate transaction.

Courses that were excluded or whose schedule was dissolved are not shown in the student's available Courses, are not included in the student's total Course count, and are excluded from rating and ranking calculations.

### Control assessment availability

Authorized users can open or close student rating access separately for:

- **SHS students**
- **College students**

Closing one group does not close assessment access for the other group. Changing rating access is recorded in the Activity Log.

## 5. Sign out

1. Close any open student-detail modal.
2. Select **Sign out** at the bottom of the sidebar.
3. Confirm that SATP returns to the public page.

Sign-in and sign-out activity is recorded. Always sign out when using a shared computer.

## 6. Troubleshooting

### The student is not listed

- Confirm the correct school year and semester or term.
- Search using the exact student ID number/username.
- Confirm that the student has an enrollment for the selected period in **Student Course** maintenance.
- Confirm the account and enrollment are active and not excluded.

### A Course is missing from the detail view

- Confirm the Course is assigned to the student for the selected period.
- Confirm the enrollment has not been excluded.
- Confirm the schedule has not been dissolved.
- For CHS, verify all teachers assigned to the schedule code.

### The table keeps loading or reports an Ajax/session error

- The SATP session may have expired. Follow the session-expired prompt and sign in again.
- Avoid repeatedly selecting **Load students** while the current request is still running.
- If the issue continues, record the selected period, student ID, time, and displayed error, then contact the MIS Department.

## 7. Support

For access, enrollment, or technical concerns, contact the NDMU MIS Department. Include the student ID number, selected academic period, and a screenshot when useful. Never send a user's password or Google credential.
