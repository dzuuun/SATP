var student_id;
var semester_id;
var school_year_id;
var currentSemesterId;
var currentSchoolYearId;
var user = localStorage.getItem("user_id");
var maintenanceAccess = localStorage.getItem("maintenanceAccess");
var username = localStorage.getItem("username");
let periodStudents = new Map();

if (user === null) {
  alert("Log in to continue.");
  window.location.href = "../../index.html";
}

if (maintenanceAccess == 0) {
  alert("You don't have permission to access this page. Redirecting...");
  history.back();
}

let studentTable = $("#studentTable").DataTable({
  columns: [
    { data: "student_number", title: "ID number", width: "18%" },
    { data: "student_name", title: "Student name" },
    { data: "college", title: "College" },
    { data: "course", title: "Course", className: "dt-center" },
    { data: "total_count", title: "Total subjects", className: "dt-center" },
    {
      data: "student_id",
      title: "Actions",
      orderable: false,
      searchable: false,
      className: "dt-center",
      render: (data) => `
        <button type="button" class="table-view-button" onclick="openStudentSubjects(${Number(
          data,
        )})" aria-label="View student subjects" title="View subjects">
          <svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
        </button>`,
    },
  ],
  pageLength: 10,
  language: {
    search: "",
    searchPlaceholder: "Search students...",
    paginate: { previous: "Previous", next: "Next" },
  },
});

let table = $("#table").DataTable({
  columnDefs: [{ className: "dt-center", targets: "_all" }],
  // ordering: false,
  columns: [
    { data: "subject_code", title: "Subject code" },
    { data: "subject_name", title: "Subject name" },
    { data: "teacher_name", title: "Teacher" },
    { data: "schedule_code", title: "Schedule" },
    { data: "time_start", title: "Starts" },
    { data: "time_end", title: "Ends" },
    { data: "day", title: "Day" },
    { data: "room", title: "Room" },
    {
      title: "Actions",
      width: "8%",
      orderable: false,
      data: null,
      render: function (data, type, row) {
        return `<button type="button" class="table-deactivate-button" onclick="deactivateSubject(${row.id})" aria-label="Exclude ${row.subject_code}" title="Exclude subject">
          <svg viewBox="0 0 24 24"><path d="M6 12h12"/><circle cx="12" cy="12" r="9"/></svg>
        </button>`;
      },
    },
  ],
});

let tableExcluded = $("#tableExcluded").DataTable({
  columnDefs: [{ className: "dt-center", targets: "_all" }],
  ordering: false,
  columns: [
    { data: "subject_code" },
    { data: "subject_name" },
    { data: "teacher_name" },
    { data: "schedule_code" },
    { data: "time_start" },
    { data: "time_end" },
    { data: "day" },
    { data: "room" },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.is_excluded
            ? `<span  style="color: red">Yes</span>`
            : "<span>No</span>"
        }
                </td>`;
      },
    },
    { data: "reason" },
  ],
});

const searchData = document.querySelector("#loadDataForm");
searchData.addEventListener("submit", async (event) => {
  event.preventDefault();
  semester_id = document.getElementById("loadSemester").value;
  school_year_id = document.getElementById("loadSchoolYear").value;

  if (semester_id !== "" && school_year_id !== "") {
    await loadPeriodStudents(school_year_id, semester_id);
  }
});

function loadIncludedData() {
  loadSpinner("Loading the selected student's subjects");
  return $.ajax({
    url: `/api/studentsubject/included/student_id=${student_id}&school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      hideSpinner();
      setSuccessMessage(response.message);
      table.clear().draw();
      table.rows.add(response.data).draw();
      document.getElementById("includedCount").textContent =
        response.data?.length || 0;
    })
    .fail(function () {
      hideSpinner();
      setErrorMessage("Unable to load the selected student's subjects.");
    });
}

function loadExcludedData() {
  return $.ajax({
    url: `/api/studentsubject/overall/student_id=${student_id}&school_year_id=${school_year_id}&semester_id=${semester_id}`,
    type: "get",
  })
    .done(function (response) {
      tableExcluded.clear().draw();
      tableExcluded.rows.add(response.data).draw();
      document.getElementById("excludedCount").textContent =
        response.data?.filter((row) => Number(row.is_excluded)).length || 0;
    })
    .fail(function (jqXHR, textStatus, errorThrown) {});
}

async function loadCurrentPeriodData() {
  if (!currentSchoolYearId || !currentSemesterId) {
    hideSpinner();
    return setErrorMessage(
      "No active school year and semester are currently configured.",
    );
  }
  return loadPeriodStudents(currentSchoolYearId, currentSemesterId);
}

async function loadPeriodStudents(selectedSchoolYearId, selectedSemesterId) {
  loadSpinner("Loading students");
  try {
    const response = await fetch(
      `/api/studentsubject/period/students/school_year_id=${selectedSchoolYearId}&semester_id=${selectedSemesterId}`,
    ).then((result) => result.json());
    if (!response.success) throw new Error(response.message);

    const rows = (response.data || []).map((row) => ({
      ...row,
      student_id: Number(row.student_id),
      included_count: Number(row.included_count),
      excluded_count: Number(row.excluded_count),
      total_count: Number(row.total_count),
    }));
    periodStudents = new Map(rows.map((row) => [Number(row.student_id), row]));
    studentTable
      .clear()
      .rows.add([...periodStudents.values()])
      .draw();

    const schoolYear = document.querySelector(
      `#selectSchoolYear option[value="${selectedSchoolYearId}"]`,
    )?.textContent;
    const semester = document.querySelector(
      `#selectSemester option[value="${selectedSemesterId}"]`,
    )?.textContent;
    const context = document.getElementById("enrollmentContext");
    context.textContent = `Showing all students for ${schoolYear || "the current school year"} · ${semester || "the current semester"}`;
    context.classList.remove("hidden");
  } catch (error) {
    setErrorMessage("Unable to load students for the selected period.");
  } finally {
    hideSpinner();
  }
}

async function openStudentSubjects(selectedStudentId) {
  const student = periodStudents.get(Number(selectedStudentId));
  if (!student) return;
  student_id = Number(selectedStudentId);
  school_year_id =
    document.getElementById("loadSchoolYear").value || currentSchoolYearId;
  semester_id =
    document.getElementById("loadSemester").value || currentSemesterId;
  document.getElementById("studentSubjectsTitle").textContent =
    student.student_name;
  document.getElementById("studentSubjectsContext").textContent =
    `${student.student_number} · ${student.total_count} subject${
      student.total_count === 1 ? "" : "s"
    }`;
  showEnrollmentTab("included");
  toggleModal("studentSubjectsModal", true);
  setTimeout(() => {
    table.columns.adjust();
    tableExcluded.columns.adjust();
  }, 260);
  await Promise.all([loadIncludedData(), loadExcludedData()]);
}

function openAddModal() {
  document.getElementById("selectStudent").value = "";
  document.getElementById("selectSemester").value = currentSemesterId || "";
  document.getElementById("selectSchoolYear").value = currentSchoolYearId || "";
  ["selectStudent", "selectSemester", "selectSchoolYear"].forEach((id) =>
    syncSearchableSelect(document.getElementById(id)),
  );
  if (!document.querySelector(".subject-entry")) addSubjectRow();
  toggleModal("addNewModal", true);
}

// post student subject to API
const formAddStudentSubject = document.querySelector("#newStudentSubjectForm");
formAddStudentSubject.addEventListener("submit", async (event) => {
  event.preventDefault();
  const rows = [...document.querySelectorAll(".subject-entry")];
  if (
    !rows.length ||
    !confirm(`Add ${rows.length} subject${rows.length === 1 ? "" : "s"}?`)
  )
    return;
  const shared = {
    student_id: document.getElementById("selectStudent").value,
    school_year_id: document.getElementById("selectSchoolYear").value,
    semester_id: document.getElementById("selectSemester").value,
    user_id: user,
  };
  const subjects = rows.map((row) => {
    const formData = new FormData();
    row.querySelectorAll("input, select").forEach((control) => {
      if (control.name !== "is_included")
        formData.set(control.name, control.value);
    });
    const included = row.querySelector('[name="is_included"]').checked;
    return {
      ...Object.fromEntries(formData),
      is_excluded: included ? 0 : 1,
    };
  });

  try {
    const response = await fetch("/api/studentsubject/add-many", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...shared, subjects }),
    }).then(async (result) => {
      const payload = await result.json();
      if (!result.ok && result.status !== 409) {
        throw new Error(payload.message || "Unable to add subjects.");
      }
      return payload;
    });

    const createdRecords = response.data?.created || [];
    const duplicateCount = response.data?.duplicates?.length || 0;
    await Promise.all(
      createdRecords.map((record) => confirmGenerateTransaction(record.id)),
    );

    if (createdRecords.length) {
      toggleModal("addNewModal", false);
      if (student_id && school_year_id && semester_id) {
        await Promise.all([loadExcludedData(), loadIncludedData()]);
      } else {
        await loadCurrentPeriodData();
      }
    }

    setSuccessMessage(
      `${createdRecords.length} subject${
        createdRecords.length === 1 ? "" : "s"
      } added${duplicateCount ? `; ${duplicateCount} already existed` : ""}.`,
    );
  } catch (error) {
    setErrorMessage(error.message || "Unable to add the selected subjects.");
  }
});

function addSubjectRow() {
  const fragment = document
    .getElementById("subjectRowTemplate")
    .content.cloneNode(true);
  const entry = fragment.querySelector(".subject-entry");
  entry.querySelector(".row-subject").innerHTML =
    document.getElementById("selectSubject").innerHTML;
  entry.querySelector(".row-teacher").innerHTML =
    document.getElementById("selectTeacher").innerHTML;
  entry.querySelector(".row-room").innerHTML =
    document.getElementById("selectRoom").innerHTML;
  document.getElementById("subjectRows").appendChild(fragment);
  entry.querySelectorAll("select").forEach(enhanceSearchableSelect);
  renumberSubjectRows();
}

function removeSubjectRow(button) {
  if (document.querySelectorAll(".subject-entry").length === 1) return;
  button.closest(".subject-entry").remove();
  renumberSubjectRows();
}

function renumberSubjectRows() {
  document.querySelectorAll(".subject-entry").forEach((row, index) => {
    row.querySelector(".subject-row-number").textContent = index + 1;
    row.querySelector(".remove-subject-row").hidden =
      index === 0 && document.querySelectorAll(".subject-entry").length === 1;
  });
}

function enhanceSearchableSelect(select) {
  if (!select || select.dataset.searchable === "true") return;
  select.dataset.searchable = "true";
  const wrapper = document.createElement("div");
  wrapper.className = "search-select";
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "search-select-input";
  input.readOnly = true;
  input.placeholder =
    select.options[0]?.disabled && select.options[0]?.textContent
      ? select.options[0].textContent
      : "Search and select";
  input.autocomplete = "off";

  const list = document.createElement("div");
  list.className = "search-select-list";
  const search = document.createElement("input");
  search.type = "search";
  search.className = "search-select-search";
  search.placeholder = "Search options...";
  search.autocomplete = "off";
  const optionsContainer = document.createElement("div");
  optionsContainer.className = "search-select-options";
  list.append(search, optionsContainer);
  wrapper.append(input, list);

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const options = [...select.options].filter(
      (option) =>
        !option.disabled &&
        (!query || option.textContent.toLowerCase().includes(query)),
    );
    optionsContainer.replaceChildren();
    if (!options.length) {
      const empty = document.createElement("p");
      empty.className = "search-select-empty";
      empty.textContent = "No matching options";
      optionsContainer.appendChild(empty);
      return;
    }
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `search-select-option${option.value === select.value ? " selected" : ""}`;
      button.textContent = option.textContent;
      button.addEventListener("click", () => {
        select.value = option.value;
        input.value = option.textContent;
        wrapper.classList.remove("open");
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      optionsContainer.appendChild(button);
    });
  };

  const open = () => {
    wrapper.classList.add("open");
    search.value = "";
    render();
    setTimeout(() => search.focus(), 0);
  };

  input.addEventListener("click", open);
  input.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      open();
    }
  });
  search.addEventListener("input", () => {
    render();
  });
  wrapper.addEventListener("click", (event) => event.stopPropagation());
  syncSearchableSelect(select);
}

function syncSearchableSelect(select) {
  const input = select
    ?.closest(".search-select")
    ?.querySelector(".search-select-input");
  if (!input) return;
  input.value = select.selectedOptions[0]?.disabled
    ? ""
    : select.selectedOptions[0]?.textContent || "";
}

document.addEventListener("click", () => {
  document
    .querySelectorAll(".search-select.open")
    .forEach((wrapper) => wrapper.classList.remove("open"));
});

function setSuccessMessage(message) {
  showToast(message, true);
}

function setErrorMessage(message) {
  showToast(message, false);
}

function showToast(message, success) {
  const toast = document.createElement("div");
  toast.className = "category-toast";
  toast.innerHTML = `<span class="toast-symbol"><svg viewBox="0 0 24 24"><path d="${success ? "m5 12 4 4L19 6" : "M12 8v5m0 3h.01M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"}"/></svg></span><span></span>`;
  toast.lastElementChild.textContent = message;
  document.getElementById("toast-container").replaceChildren(toast);
  setTimeout(() => toast.remove(), 4000);
}

// create transaction function
var rowId;
function generateTransaction(id) {
  rowId = id;
  // $("#transactionModal").modal("show");
}

var body;
async function confirmGenerateTransaction(rowId) {
  const recordResponse = await fetch(`/api/studentsubject/` + rowId, {
    method: "GET",
  }).then((res) => res.json());
  const record = recordResponse.data?.[0];
  if (!record) throw new Error("Unable to prepare the student transaction.");

  const transactionResponse = await fetch(`/api/transaction/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      school_year_id: record.school_year_id,
      semester_id: record.semester_id,
      subject_id: record.subject_id,
      teacher_id: record.teacher_id,
      user_id: user,
      id: record.student_id,
    }),
  }).then((res) => res.json());
  if (!transactionResponse.success) {
    throw new Error(
      transactionResponse.message || "Unable to generate the transaction.",
    );
  }
}

// update status on the API
var rowIdToDeact;
function deactivateSubject(id) {
  rowIdToDeact = id;
  toggleModal("deactivateModal", true);
}
const formDeactivateSubject = document.querySelector(
  "#deactivateStudentSubjectForm",
);
formDeactivateSubject.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formDeactivateSubject);

  formData.append("id", rowIdToDeact);
  formData.append("user_id", user);
  const data = Object.fromEntries(formData);

  if (confirm("This action cannot be undone.") == true) {
    await fetch(`/api/studentsubject/deactivate`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          setSuccessMessage(response.message);
          toggleModal("deactivateModal", false);
          formDeactivateSubject.reset();
          if (student_id && school_year_id && semester_id) {
            loadIncludedData();
            loadExcludedData();
          } else {
            loadCurrentPeriodData();
          }
        }
      });
  }
});

// Get schoolYear from API
const getSchoolYear = async () => {
  const schoolYearList = document.querySelector("#selectSchoolYear");
  const schoolYearList2 = document.querySelector("#loadSchoolYear");
  const [allResponse, currentResponse] = await Promise.all([
    fetch("/api/schoolyear/"),
    fetch("/api/schoolyear/inuse/active"),
  ]);
  const data = await allResponse.json();
  const currentData = await currentResponse.json();
  const rows = data.data || [];
  const endpointRows = Array.isArray(currentData.data)
    ? currentData.data
    : [currentData.data].filter(Boolean);
  const activeInUse = rows
    .filter((row) => Number(row.in_use) === 1 && Number(row.is_active) === 1)
    .sort((a, b) => {
      const startYearA = Number(String(a.name).match(/\d{4}/)?.[0] || 0);
      const startYearB = Number(String(b.name).match(/\d{4}/)?.[0] || 0);
      return startYearB - startYearA || Number(b.id) - Number(a.id);
    });
  const current =
    activeInUse[0] ||
    endpointRows
      .filter((row) => Number(row.is_active) === 1)
      .sort((a, b) => Number(b.id) - Number(a.id))[0];
  currentSchoolYearId = current?.id;

  rows.forEach((row) => {
    schoolYearList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    schoolYearList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  if (currentSchoolYearId) {
    schoolYearList.value = currentSchoolYearId;
    schoolYearList2.value = currentSchoolYearId;
  }
};

// Get semester from API
const getSemester = async () => {
  const semesterList = document.querySelector("#selectSemester");
  const semesterList2 = document.querySelector("#loadSemester");
  const endpoint = `/api/semester/inuse/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    semesterList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    semesterList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  const currentSemester = rows
    .filter((row) => Number(row.is_active) === 1)
    .sort((a, b) => Number(b.id) - Number(a.id))[0];
  currentSemesterId = currentSemester?.id;
  if (currentSemesterId) {
    semesterList.value = currentSemesterId;
    semesterList2.value = currentSemesterId;
  }
};

// Get subject from API
const getSubject = async () => {
  const subjectList = document.getElementById("selectSubject");
  const endpoint = `/api/subject/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option data-subtext="${row.code}" value="${row.id}">${row.name}</option>`;
  });
  subjectList.innerHTML += optionRow;
};

// Get teacher from API
const getTeacher = async () => {
  const teacherList = document.querySelector("#selectTeacher");
  const endpoint = `/api/teacher/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option value="${row.id}">${row.name}</option>`;
  });
  teacherList.innerHTML += optionRow;
};

// Get student from API
const getStudent = async () => {
  const studentList = document.querySelector("#selectStudent");
  const endpoint = `/api/student/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var optionRow = "";
  rows.forEach((row) => {
    optionRow += `<option value="${row.id}">${row.username} — ${row.name}</option>`;
  });
  studentList.innerHTML += optionRow;
};

// Get room from API
const getRoom = async () => {
  const roomList = document.querySelector("#selectRoom");
  const endpoint = `/api/room/all/active`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((row) => {
    roomList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

let pendingSubjectImport = { created: [], updated: [], errors: [] };
const xlsxInput = document.getElementById("xlsxInput");
const uploadFileForm = document.querySelector("#uploadFileForm");

xlsxInput.addEventListener("change", () => {
  if (xlsxInput.files[0]) {
    document.querySelector("#dropZone p").textContent =
      `Selected: ${xlsxInput.files[0].name}`;
  }
});

document.getElementById("downloadLink").addEventListener("click", (event) => {
  event.preventDefault();
  const sheet = XLSX.utils.json_to_sheet([
    {
      SchoolYear: "2025-2026",
      semester_id: 3,
      StudentID: "2024-00001",
      LastName: "Dela Cruz",
      FirstName: "Maria",
      MiddleName: "",
      YearLevel: "1",
      Sex: "Female",
      CourseCode: "BSIT",
      CourseDesc: "Bachelor of Science in Information Technology",
      DeptCode: "CCS",
      DepartmentDesc: "College of Computer Studies",
      SubjectCode: "ENG 101",
      Description: "English Communication",
      LecUnits: 3,
      LabUnits: 0,
      schedule_code: "ENG101-A",
      day: "MWF",
      RoomCode: "R101",
      time_start: "08:00",
      time_end: "09:00",
      InstructorID: "FAC-001",
      TeacherLastName: "Santos",
      TeacherFirstName: "Juan",
      TeacherMiddleName: "",
      StatusCode: "A",
      CollegeCode: "CCS",
      CollegeName: "College of Computer Studies",
      Title: "Instructor",
    },
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Student Subjects");
  XLSX.writeFile(book, "student_subject_import_template.xlsx");
});

uploadFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!xlsxInput.files[0]) return;
  try {
    const rows = await parseWorkbook(xlsxInput.files[0]);
    pendingSubjectImport = classifySubjectRows(rows);
    renderSubjectImportPreview();
    toggleModal("importFileModal", false);
    setTimeout(() => toggleModal("importPreviewModal", true), 250);
  } catch (error) {
    setErrorMessage(error.message || "Unable to validate the Excel file.");
  }
});

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const book = XLSX.read(new Uint8Array(event.target.result), {
          type: "array",
        });
        resolve(
          XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {
            defval: "",
            raw: false,
          }),
        );
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function normalizeImportValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function readImportColumn(row, ...columnNames) {
  const columns = new Map(
    Object.keys(row).map((key) => [normalizeImportValue(key), row[key]]),
  );
  for (const name of columnNames) {
    const value = columns.get(normalizeImportValue(name));
    if (value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
}

function normalizeImportTime(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const twelveHour = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!twelveHour) return text;
  let hour = Number(twelveHour[1]) % 12;
  if (twelveHour[4].toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${twelveHour[2]}:${
    twelveHour[3] || "00"
  }`;
}

function optionMap(selectId, valueReader = (option) => option.textContent) {
  return new Map(
    [...document.querySelectorAll(`#${selectId} option[value]`)]
      .filter((option) => option.value)
      .map((option) => [
        normalizeImportValue(valueReader(option)),
        Number(option.value),
      ]),
  );
}

function classifySubjectRows(rows) {
  const students = optionMap(
    "selectStudent",
    (option) => option.textContent.split(/â€”|—/)[0],
  );
  const schoolYears = optionMap("selectSchoolYear");
  const semesters = optionMap("selectSemester");
  const semesterIds = new Map(
    [...document.querySelectorAll("#selectSemester option[value]")]
      .filter((option) => option.value)
      .map((option) => [String(Number(option.value)), Number(option.value)]),
  );
  const subjects = optionMap(
    "selectSubject",
    (option) => option.dataset.subtext,
  );
  const teachers = optionMap("selectTeacher");
  const rooms = optionMap("selectRoom");
  const seen = new Set();
  const result = { created: [], updated: [], errors: [] };

  rows.forEach((raw, index) => {
    const studentNumber = readImportColumn(raw, "StudentID", "IDNumber");
    const schoolYear = readImportColumn(raw, "SchoolYear");
    const semesterValue = readImportColumn(raw, "semester_id", "Semester");
    const subjectCode = readImportColumn(raw, "SubjectCode");
    const teacherName = `${readImportColumn(
      raw,
      "TeacherFirstName",
    )} ${readImportColumn(raw, "TeacherLastName")}`.trim();
    const roomCode = readImportColumn(raw, "RoomCode");
    const resolved = {
      student_id: students.get(normalizeImportValue(studentNumber)),
      school_year_id: schoolYears.get(normalizeImportValue(schoolYear)),
      semester_id:
        semesterIds.get(String(Number(semesterValue))) ||
        semesters.get(normalizeImportValue(semesterValue)),
      subject_id: subjects.get(normalizeImportValue(subjectCode)),
      teacher_id: teachers.get(normalizeImportValue(teacherName)),
      room_id: roomCode ? rooms.get(normalizeImportValue(roomCode)) : null,
      schedule_code: String(
        readImportColumn(raw, "schedule_code", "ScheduleCode"),
      ).trim(),
      time_start: normalizeImportTime(
        readImportColumn(raw, "time_start", "TimeStart", "TimeBegin"),
      ),
      time_end: normalizeImportTime(
        readImportColumn(raw, "time_end", "TimeEnd"),
      ),
      day: String(readImportColumn(raw, "day", "Day", "DayCode")).trim(),
      is_excluded: 0,
    };
    const missing = [];
    if (!resolved.student_id) missing.push("student");
    if (!resolved.school_year_id) missing.push("school year");
    if (!resolved.semester_id) missing.push("semester");
    if (!resolved.subject_id) missing.push("subject");
    if (!resolved.teacher_id) missing.push("teacher");
    if (roomCode && !resolved.room_id) missing.push("room");
    const key = [
      resolved.student_id,
      resolved.school_year_id,
      resolved.semester_id,
      resolved.subject_id,
    ].join("|");
    const item = { rowNumber: index + 2, originalRow: raw, ...resolved };

    if (missing.length) {
      result.errors.push({
        ...item,
        reason: `Unknown or missing ${missing.join(", ")}`,
      });
    } else if (seen.has(key)) {
      result.errors.push({
        ...item,
        reason: "Duplicate student subject in file",
      });
    } else {
      seen.add(key);
      result.created.push(item);
    }
  });
  return result;
}

function renderSubjectImportPreview() {
  [
    ["created", "createdPreview", "createdCount", "Will be created"],
    ["updated", "updatedPreview", "updatedCount", "Already exists"],
    ["errors", "errorPreview", "errorCount", ""],
  ].forEach(([key, listId, countId, detail]) => {
    const items = pendingSubjectImport[key];
    const list = document.getElementById(listId);
    document.getElementById(countId).textContent = items.length;
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "preview-empty";
      empty.textContent = `No ${key} found`;
      list.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "preview-row";
      row.innerHTML =
        '<span class="row-number"></span><span class="item-question"></span><span class="row-detail"></span>';
      row.children[0].textContent = `Row ${item.rowNumber}`;
      row.children[1].textContent = `${readImportColumn(
        item.originalRow,
        "StudentID",
        "IDNumber",
      )} — ${readImportColumn(item.originalRow, "SubjectCode")}`;
      row.children[2].textContent = item.reason || detail;
      list.appendChild(row);
    });
  });
  document.getElementById("runImportButton").disabled =
    !pendingSubjectImport.created.length && !pendingSubjectImport.errors.length;
}

document
  .getElementById("runImportButton")
  .addEventListener("click", async () => {
    const errors = pendingSubjectImport.errors.map((item) => ({
      ...item.originalRow,
      Error: item.reason,
    }));
    const groups = new Map();
    pendingSubjectImport.created.forEach((item) => {
      const key = `${item.student_id}|${item.school_year_id}|${item.semester_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    toggleModal("importPreviewModal", false);
    if (!groups.size) {
      downloadSubjectImportErrors(errors);
      return setErrorMessage(`${errors.length} invalid rows exported.`);
    }
    setTimeout(() => toggleModal("spinnerStatusModal", true), 250);

    let created = 0;
    let transactionFailures = 0;
    const groupEntries = [...groups.values()];
    for (let index = 0; index < groupEntries.length; index++) {
      const items = groupEntries[index];
      const shared = {
        student_id: items[0].student_id,
        school_year_id: items[0].school_year_id,
        semester_id: items[0].semester_id,
        user_id: user,
      };
      try {
        const response = await fetch("/api/studentsubject/add-many", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...shared, subjects: items }),
        });
        const payload = await response.json();
        const createdRows = payload.data?.created || [];
        const duplicateIds = new Set(
          (payload.data?.duplicates || []).map((item) =>
            Number(item.subject_id),
          ),
        );
        created += createdRows.length;
        const transactionResults = await Promise.allSettled(
          createdRows.map((record) => confirmGenerateTransaction(record.id)),
        );
        transactionResults.forEach((result) => {
          if (result.status === "fulfilled") return;
          transactionFailures++;
        });
        items
          .filter((item) => duplicateIds.has(Number(item.subject_id)))
          .forEach((item) =>
            errors.push({
              ...item.originalRow,
              Error: "Student subject already exists",
            }),
          );
        if (!response.ok && response.status !== 409) {
          throw new Error(payload.message || "Server rejected rows");
        }
      } catch (error) {
        items.forEach((item) =>
          errors.push({
            ...item.originalRow,
            Error: error.message || "Import request failed",
          }),
        );
      }
      document.getElementById("statusMessage").textContent =
        `${Math.round(((index + 1) / groupEntries.length) * 100)}%`;
    }

    toggleModal("spinnerStatusModal", false);
    if (errors.length) downloadSubjectImportErrors(errors);
    await loadCurrentPeriodData();
    setTimeout(
      () =>
        setSuccessMessage(
          `${created} created${
            errors.length ? `, ${errors.length} failed rows exported` : ""
          }${
            transactionFailures
              ? `; ${transactionFailures} transaction generations failed`
              : ""
          }.`,
        ),
      350,
    );
  });

function downloadSubjectImportErrors(rows) {
  if (!rows.length) return;
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Import Errors");
  XLSX.writeFile(
    book,
    `Student_Subject_Import_Errors_${
      new Date().toISOString().split("T")[0]
    }.xlsx`,
  );
}

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  document.querySelector("footer").style.marginLeft = "250px";
  nav = true;
}

var nav = false;

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
  document.querySelector("footer").style.marginLeft = "0";
  nav = false;
}
function toggleNav() {
  nav ? closeNav() : openNav();
}

function toggleModal(id, show = true) {
  const modal = document.getElementById(id);
  const card = document.getElementById(`${id}Card`);
  if (!modal) return;
  if (show) {
    modal.classList.remove("invisible");
    setTimeout(() => {
      modal.classList.add("opacity-100");
      card?.classList.replace("scale-95", "scale-100");
    }, 10);
    document.body.classList.add("overflow-hidden");
  } else {
    modal.classList.remove("opacity-100");
    card?.classList.replace("scale-100", "scale-95");
    setTimeout(() => modal.classList.add("invisible"), 250);
    document.body.classList.remove("overflow-hidden");
  }
}

function showEnrollmentTab(tab) {
  const included = tab === "included";
  document
    .getElementById("includedPanel")
    .classList.toggle("hidden", !included);
  document.getElementById("excludedPanel").classList.toggle("hidden", included);
  document.getElementById("includedTab").classList.toggle("active", included);
  document.getElementById("excludedTab").classList.toggle("active", !included);
  if (!included) tableExcluded.columns.adjust().draw(false);
}

function loadSpinner(message = "Loading student subjects") {
  const overlay = document.getElementById("tableLoadingOverlay");
  const card = document.getElementById("tableLoadingOverlayCard");
  const label = document.getElementById("tableLoadingMessage");
  if (!overlay) return;
  if (label) label.textContent = message;
  overlay.classList.remove("invisible");
  requestAnimationFrame(() => {
    overlay.classList.add("opacity-100");
    card?.classList.replace("scale-95", "scale-100");
  });
  document.body.classList.add("overflow-hidden");
}

function hideSpinner() {
  const overlay = document.getElementById("tableLoadingOverlay");
  const card = document.getElementById("tableLoadingOverlayCard");
  if (!overlay) return;
  overlay.classList.remove("opacity-100");
  card?.classList.replace("scale-100", "scale-95");
  setTimeout(() => overlay.classList.add("invisible"), 250);
  document.body.classList.remove("overflow-hidden");
}

async function loadSidebar() {
  try {
    const container = document.getElementById("sidebar-container");
    const response = await fetch("/sidebar.html");
    container.innerHTML = await response.text();
    const fullname = document.getElementById("sidebar-fullname");
    if (fullname)
      fullname.textContent =
        localStorage.getItem("fullname") || username || "User";
    document.querySelectorAll(".menu-toggle").forEach((toggle) => {
      toggle.addEventListener("click", function () {
        const menu = document.getElementById(this.dataset.target);
        menu?.classList.toggle("hidden");
        const hidden = menu?.classList.contains("hidden");
        this.setAttribute("aria-expanded", String(!hidden));
        const arrow = this.querySelector(".chevron");
        if (arrow) {
          arrow.style.transform = hidden ? "rotate(0deg)" : "rotate(180deg)";
        }
      });
    });
    const currentPath = location.pathname.replace(/\/+$/, "").toLowerCase();
    document.querySelectorAll("#mySidenav a[href]").forEach((link) => {
      const linkPath = new URL(link.href, location.origin).pathname
        .replace(/\/+$/, "")
        .toLowerCase();
      if (linkPath !== currentPath && !currentPath.endsWith(linkPath)) return;

      const submenu = link.closest("ul[id^='dropdown-']");
      link.classList.add(submenu ? "sub-active" : "nav-active");
      if (submenu) {
        submenu.classList.remove("hidden");
        const toggle = document.querySelector(
          `.menu-toggle[data-target="${submenu.id}"]`,
        );
        toggle?.setAttribute("aria-expanded", "true");
        const arrow = toggle?.querySelector(".chevron");
        if (arrow) arrow.style.transform = "rotate(180deg)";
      }
    });
    document.getElementById("signout")?.addEventListener("click", () => {
      localStorage.clear();
      location.href = "../../index.html";
    });
  } catch (error) {
    console.error("Sidebar failed to load:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  await Promise.all([
    getRoom(),
    getSchoolYear(),
    getSemester(),
    getTeacher(),
    getSubject(),
    getStudent(),
    loadSidebar(),
  ]);
  document.querySelectorAll(".field select").forEach(enhanceSearchableSelect);
  addSubjectRow();
  await loadCurrentPeriodData();
});
