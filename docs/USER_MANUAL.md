# SATP User Manual

Student Assessment of Teacher's Performance  
Notre Dame of Marbel University

Version: August 2026

## 1. About SATP

SATP allows students to assess their teachers and enables authorized personnel to maintain academic data, monitor assessment completion, manage access, and generate rating and ranking reports.

The pages shown in the sidebar depend on the signed-in user's permissions. A user only sees modules their assigned role is allowed to access.

## 2. Signing in and out

### Sign in

1. Open the SATP landing page.
2. Select **Log in to SATP**.
3. Enter your username and password.
4. Select **Sign in**.

If the credentials are invalid or the account is inactive, SATP displays an error message. Contact the MIS Department if access cannot be restored.

### Sign out

Select **Sign out** at the bottom of the sidebar. Login and logout events are recorded in the activity log.

### Change a password

1. Select **Password** at the bottom of the sidebar.
2. Enter the requested current and new password information.
3. Confirm the update.

Use a password that follows the guidance displayed on the page. Do not share account credentials.

## 3. Student assessment

Student accounts open the **Courses to rate** workspace after login. The page separates pending assessments from completed assessments and uses the current active academic period. A student can only open the rating form when a pending course is available and student rating access is open.

### View courses to rate

After a student signs in, the **Courses to rate** page displays assigned courses for the active school year and semester. Completed courses are not available for another submission.

If a course is missing, verify the student's enrollment under **Student Course** maintenance or contact the responsible administrator.

### Submit an assessment

1. Select an available course.
2. Review the teacher, course, school year, and semester information.
3. Give one rating for every active assessment item.
4. Optionally enter a written comment.
5. Review the answered-item progress indicator.
6. Select **Submit assessment** and confirm.
7. Wait for the success confirmation before leaving the page.

Assessments cannot be edited after successful submission. Do not refresh, close the tab, or navigate away while the submission modal is visible.

If every assigned course is already marked completed, no **Rate now** action is displayed. This protects submitted ratings from being replaced or submitted twice.

## 4. Transactions

The **Transactions** module monitors student assessment progress for a selected school year and semester.

1. Select the school year and semester.
2. Load the matching students.
3. Use search and table controls to locate a student.
4. Open a student's detail view to review assigned, pending, and completed courses.
5. Use the unrated view when a list of incomplete assessments is required.

Authorized administrators can open or close student rating access. When rating access is closed, students cannot submit assessments.

## 5. Maintenance

Maintenance pages are only available to roles with maintenance permission. The system currently includes:

- College
- Department
- Program
- Course
- Teacher
- Student
- Admin
- School year
- Semester
- Room
- Category
- Item
- Student Course
- Schedule assignment

### Common maintenance controls

Most maintenance pages support the following actions:

- **Search** filters the displayed table.
- **Add** creates a record.
- **Edit** updates a selected record.
- **Show inactive** includes inactive records; inactive records are excluded by default.
- Pagination controls move between result pages.

Deactivate records that must be retained for history. Only create a replacement record when it represents a genuinely different entity.

### Add a maintenance record

1. Open **Maintenance** and select the required page.
2. Select the **Add** or **New** button above the table.
3. Complete every required field in the modal.
4. Set the record to active when it should be immediately available in dropdowns and transactions.
5. Review spelling, codes, and parent assignments.
6. Select the modal's save button once.
7. Wait for the loading indicator to close and verify the success toast.
8. Search for the new record to confirm it appears in the table.

If the code or identifying value already exists, edit the existing record instead of creating another one.

### Edit or change a record's status

1. Search for the record in the table.
2. Select its **Edit** action.
3. Change only the required fields.
4. To hide a record from normal use, change its status to inactive instead of renaming it for reuse.
5. Save the changes and wait for confirmation.
6. Enable **Show inactive** when verifying a deactivated record.

Changes to academic structure can affect later dropdowns and reports. Confirm the correct parent College, Department, or Program before saving.

### College

To add or edit a College:

1. Open **Maintenance > College**.
2. Select **Add college**, or select **Edit** beside an existing row.
3. Enter the College code and name.
4. Set its active status.
5. Save and verify the row.

For bulk work, use **Import file**, select the Excel workbook, validate the rows, and confirm the import. Departments should only be assigned after their parent College exists.

### Department

1. Open **Maintenance > Department**.
2. Select **Add department** or edit an existing Department.
3. Enter its code and name.
4. Select the correct parent College.
5. Set the active status and save.
6. Verify the College shown in the table.

During import, College references must match existing College data. Resolve unmatched parent codes before confirming the workbook.

### Program

1. Open **Maintenance > Program**.
2. Select **Add program** or edit a row.
3. Enter the Program code and name.
4. Select the correct Department.
5. Set the active status and save.
6. Confirm the Program appears under the intended Department.

Use the Program import for bulk changes. Create Colleges and Departments first so every Program can be linked correctly.

### Course

1. Open **Maintenance > Course**.
2. Select **Add course** or edit a row.
3. Enter the Course code and complete Course name.
4. Set the active status.
5. Save and search for the Course code.

Use unique codes. Long Course names are supported and wrap in tables and reports. The Course workbook import can create new rows, update changed rows, and skip unchanged rows.

### Teacher

1. Open **Maintenance > Teacher**.
2. Select **Add teacher** or edit a teacher.
3. Enter the prefix, first name, middle name when applicable, last name, and suffix when applicable.
4. Select the Department and teaching status.
5. Set the active status.
6. Save and verify the fully formatted name in the table.

Teacher prefix and suffix values appear in schedule assignment, logs, and reports. During import, verify names carefully to prevent duplicate teacher identities.

### Student

1. Open **Maintenance > Student**.
2. Select **Add student** or edit a student.
3. Enter the username or student ID number.
4. Enter the student's name and required profile information.
5. Select the Program and year level.
6. Enter a password only when creating an account or intentionally resetting it.
7. Set the account status and save.
8. Search by username to verify the account.

For workbook uploads, passwords for new accounts are securely hashed. Existing accounts are updated only when imported values differ; unchanged students are skipped.

### Admin

Users who require an administrator account must request one from an authorized system administrator. The administrator will review the request and create the account with the appropriate permission role.

1. Open **Maintenance > Admin**.
2. Select **Add admin** or edit an account.
3. Enter the username and administrator's profile information.
4. Assign the correct permission role.
5. Set the temporary-password and active-account options as required.
6. Enter a password for a new account or an intentional reset.
7. Save and confirm the account appears in the directory.

Never reuse a shared administrator account. Give each administrator an individual username and the least-permissive suitable role.

### School year

1. Open **Maintenance > School year**.
2. Select **Add school year** or edit an existing period.
3. Enter the school-year label in the institution's standard format.
4. Set the active status.
5. Save and verify the result.

More than one historical school year can remain in use, but the active flag determines the current default where applicable. Confirm the intended period before changing status.

### Semester

1. Open **Maintenance > Semester**.
2. Select **Add semester** or edit a row.
3. Enter the semester name.
4. Set the active status.
5. Save and verify the result.

The system can retain multiple semesters. Use the active flag carefully because transaction and schedule pages load the current period by default.

### Room

1. Open **Maintenance > Room**.
2. Select **Add room** or edit an existing room.
3. Enter the room name or code.
4. Set the active status and save.
5. Confirm the room appears in search results.

For multiple rooms, upload the Excel workbook, review all validation groups, and run the import.

### Category

1. Open **Maintenance > Category**.
2. Select **Add category** or edit a row.
3. Enter the category name and its required ordering or status information.
4. Save the category.
5. Verify it appears in the intended assessment order.

Only active categories and their active items are presented during student assessment.

### Item

1. Open **Maintenance > Item**.
2. Select **Add item** or edit an item.
3. Enter the item number and question text.
4. Select the correct Category.
5. Set the active status and save.
6. Confirm the item number, question, and Category in the table.

When importing items, all referenced Categories must already exist. Avoid duplicate item numbers within the intended assessment structure, and preview updates before applying them.

### Import a workbook

1. Open the required maintenance page.
2. Select the upload/import action.
3. Choose the Excel workbook.
4. Wait while SATP reads and validates the workbook. On Student Course imports, the validation modal displays progress.
5. Review the import preview:
   - **New/Created** means the row will create a record.
   - **Updated** means an existing record contains changed data.
   - **Unchanged/Skipped** means the row already matches the database.
   - **Error** means the row cannot be imported and includes a reason.
6. Correct errors in the workbook when necessary.
7. Confirm the import and wait for the completion message.

Re-uploading an unchanged workbook should not create duplicates or report unchanged rows as updates.

### Student and admin passwords during import

New account passwords are securely hashed before storage. Existing accounts are updated only when imported values actually differ.

### Student Course maintenance

Use this page to assign courses and schedules to students or import enrollment workbooks. Teacher matching during import uses the teacher's first and last name. An existing enrollment is detected using its academic assignment details and is not created again.

To add an enrollment manually:

1. Open **Maintenance > Student Course**.
2. Select the school year and semester to load.
3. Search for and select the student.
4. Select **Add course**.
5. Select the Course, teacher, schedule code, and other required assignment information.
6. Use the search field inside the teacher dropdown when needed.
7. Review the selected period and assignment.
8. Save and wait for the success confirmation.
9. Open the student's course list and verify the enrollment.

To edit or exclude an enrollment:

1. Load the correct period and student.
2. Open the student's assigned courses.
3. Select the action for the target enrollment.
4. Correct the assignment or change its exclusion status.
5. Save and verify the updated row.

To upload enrollments:

1. Select **Import file** and choose the workbook.
2. Keep the validation modal open while the progress indicator advances.
3. Review created, updated, unchanged, and error enrollments.
4. Confirm that repeated enrollments are listed as unchanged rather than new.
5. Correct ambiguous teachers or invalid references in the workbook.
6. Select the import action and wait for the completion totals.
7. Verify a sample of imported students and schedule codes in the table.

Student Course upload logs identify students by username and identify assignments by schedule code rather than internal database IDs.

### Schedule assignment

Use **Schedule assignment** to reassign the teacher handling a schedule code.

1. Select the school year and semester. The page initially loads the current period.
2. Search for the schedule code.
3. Select **Reassign**.
4. Open the teacher dropdown and use its internal search field.
5. Select the new teacher.
6. Confirm the reassignment and wait for the loading and success messages.

The table and activity log display teacher names with available prefixes and suffixes.

## 6. Rating reports

Open **Reports > Rating**, select a report type, and complete the filters shown by the page.

### Available rating reports

- **Institutional rating** reports a selected teacher and course.
- **College rating** summarizes results for a college.
- **Department rating** summarizes results for a department.
- **Individual rating** reports a selected teacher and course.

### Generate a report

1. Select the report type.
2. Select the school year and semester.
3. Complete the additional college, department, teacher, or course filters.
4. Select **Generate report**.
5. Review the report before downloading or printing.

Only available completed assessment records matching the filters are included. Teacher names include available prefixes and suffixes.

### Download and ZIP export

- Use **Download PDF** on a generated report to save that report.
- Use **Export ZIP** to export reports for all teachers in a period or all courses for a selected teacher.
- Wait for export progress to finish before closing the page.

The page, individual PDF, and ZIP versions use the same report layout and decimal rounding. A value ending in an exact half-cent, such as `3.605`, is displayed as `3.61`.

## 7. Ranking reports

Open **Reports > Ranking** and select one of the following:

- Overall ranking — College
- Overall ranking — SHS
- College ranking
- Department ranking

Then select the required organization, school year, semester, and teaching status:

- Full Time
- Part Time
- NTPO & Admin

Select **Generate report**. Only completed assessments matching the filters are included. Long college and organization names wrap within their report cells.

## 8. Users and access

### User management

Authorized users can create, edit, activate, deactivate, search, and import accounts in **Users & Access > User management**.

Assign the correct permission role when creating or editing an account. Deactivated users cannot sign in.

### Permissions

Permission roles control access to:

- Transactions
- Maintenance
- Reports
- Users and access

The sidebar automatically hides modules that the current role cannot access. For example, a report generator with Transactions and Reports permission only sees those modules.

Apply the principle of least privilege: grant only the access required for the user's responsibilities.

### Activity log

The activity log records important actions such as:

- Login and logout
- Account and maintenance changes
- Student assessment submission
- Student Course uploads
- Schedule reassignment
- Rating-access changes

Use the displayed filters and search field to locate an event. Logs use student usernames, schedule codes, course codes, and formatted teacher names where applicable.

## 9. Common problems

### A page is missing from the sidebar

The account's role does not have permission for that module. Ask an authorized administrator to review the assigned role.

### No courses appear for a student

Confirm that the enrollment exists, is not excluded, and belongs to the selected or active school year and semester.

### A workbook contains errors

Open the error section in the validation preview. Correct the referenced row and required values, then upload the workbook again.

### A report is empty

Verify the school year, semester, organization, teacher, and course filters. Reports only include completed assessments.

### A PDF is clipped or text does not wrap

Reload the page to ensure the newest report styles are active, regenerate the report, and use the built-in **Download PDF** button rather than the browser's print-to-PDF command.

### An operation remains on the loading modal

Wait briefly for large imports or exports. If it does not finish, preserve the displayed error, refresh the page, and contact the MIS Department. Avoid repeatedly submitting the same operation while it is still running.

## 10. Recommended operating practices

- Confirm the school year and semester before imports, reassignments, and reports.
- Review validation results before confirming an upload.
- Keep inactive historical records instead of recreating them.
- Verify report filters and respondent counts before distributing exports.
- Sign out when using a shared computer.
- Report unexpected errors with the page name, selected filters, time, and a screenshot.

## 11. Support

For account access, data correction, or technical issues, contact the NDMU MIS Department. Include enough information to reproduce the issue, but never send a password.
