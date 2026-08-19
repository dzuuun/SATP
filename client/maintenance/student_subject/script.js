var student_id;
var semester_id;
var school_year_id;
var currentSemesterId;
var currentSchoolYearId;
var user = localStorage.getItem("user_id");
var maintenanceAccess = localStorage.getItem("maintenanceAccess");
var username = localStorage.getItem("username");
let periodStudents = new Map();
let importTeachersByName = new Map();
let importSchoolYearsByName = new Map();
let importSemestersByName = new Map();
let importSemesterIds = new Map();
let importSubjectsByCode = new Map();
let importRoomsByCode = new Map();
let pendingRestore = null;

const teacherImportKey = (firstName, lastName) =>
  normalizeImportValue(`${firstName || ""} ${lastName || ""}`);
let importStudentsByNumber = new Map();

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
    { data: "course", title: "Program", className: "dt-center" },
    { data: "total_count", title: "Total courses", className: "dt-center" },
    {
      data: "student_id",
      title: "Actions",
      orderable: false,
      searchable: false,
      className: "dt-center",
      render: (data) => `
        <button type="button" class="table-view-button" onclick="openStudentSubjects(${Number(
          data,
        )})" aria-label="View student courses" title="View courses">
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
    { data: "subject_code", title: "Course code" },
    { data: "subject_name", title: "Course name" },
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
        return `<div class="table-action-group">
          <button type="button" class="table-edit-button" onclick="editStudentSubject(${row.id})" aria-label="Edit ${row.subject_code}" title="Edit course">
            <svg viewBox="0 0 24 24"><path d="m14 5 5 5M4 20l3.5-.8L19 7.7a2.1 2.1 0 0 0-3-3L4.8 16.2 4 20Z"/></svg>
          </button>
          <button type="button" class="table-deactivate-button" onclick="deactivateSubject(${row.id})" aria-label="Exclude ${row.subject_code}" title="Exclude course">
          <svg viewBox="0 0 24 24"><path d="M6 12h12"/><circle cx="12" cy="12" r="9"/></svg>
          </button>
        </div>`;
      },
    },
  ],
});

let tableExcluded = $("#tableExcluded").DataTable({
  columnDefs: [{ className: "dt-center", targets: "_all" }],
  ordering: false,
  columns: [
    { data: "subject_code", title: "Course code" },
    { data: "subject_name", title: "Course name" },
    { data: "teacher_name", title: "Teacher" },
    { data: "schedule_code", title: "Schedule" },
    { data: "time_start", title: "Starts" },
    { data: "time_end", title: "Ends" },
    { data: "day", title: "Day" },
    { data: "room", title: "Room" },
    {
      title: "Excluded",
      width: "5%",
      data: "is_excluded",
      render: function (data, type, row) {
        return row.is_excluded
          ? '<span class="exclusion-value">Yes</span>'
          : "<span>No</span>";
      },
    },
    { data: "reason", title: "Reason" },
    {
      title: "Actions",
      width: "6%",
      orderable: false,
      data: null,
      render: (data, type, row) =>
        `<button type="button" class="table-restore-button" onclick="openRestoreModal(${row.id})" aria-label="Restore ${row.subject_code}" title="Restore course">
          Restore
        </button>`,
    },
  ],
  autoWidth: false,
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
  loadSpinner("Loading the selected student's courses");
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
      setErrorMessage("Unable to load the selected student's courses.");
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

function openRestoreModal(id) {
  const record = tableExcluded
    .rows()
    .data()
    .toArray()
    .find((row) => Number(row.id) === Number(id));
  pendingRestore = {
    id: Number(id),
    subjectCode: String(record?.subject_code || ""),
  };
  document.getElementById("restoreSubjectCode").textContent =
    pendingRestore.subjectCode || "Selected course";
  toggleModal("restoreModal", true);
}

function closeRestoreModal() {
  toggleModal("restoreModal", false);
  pendingRestore = null;
}

async function confirmRestoreStudentSubject() {
  if (!pendingRestore?.id) return;
  const id = pendingRestore.id;
  toggleModal("restoreModal", false);
  pendingRestore = null;
  loadSpinner("Restoring student course");
  try {
    const response = await fetch("/api/studentsubject/restore", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Unable to restore the student course.");
    await Promise.all([
      loadIncludedData(),
      loadExcludedData(),
      loadPeriodStudents(school_year_id, semester_id),
    ]);
    setSuccessMessage(payload.message);
  } catch (error) {
    setErrorMessage(error.message || "Unable to restore the student course.");
  } finally {
    hideSpinner();
  }
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
    `${student.student_number} · ${student.total_count} course${
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
    !(await satpConfirm(
      `Add ${rows.length} course${rows.length === 1 ? "" : "s"}?`,
      { title: "Add student courses", confirmText: "Add courses" },
    ))
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
        throw new Error(payload.message || "Unable to add courses.");
      }
      return payload;
    });

    const createdRecords = response.data?.created || [];
    const updatedCount = response.data?.updated?.length || 0;
    const skippedCount = response.data?.skipped?.length || 0;

    if (createdRecords.length || updatedCount) {
      toggleModal("addNewModal", false);
      if (student_id && school_year_id && semester_id) {
        await Promise.all([loadExcludedData(), loadIncludedData()]);
      } else {
        await loadCurrentPeriodData();
      }
    }

    setSuccessMessage(
      `${createdRecords.length} course${
        createdRecords.length === 1 ? "" : "s"
      } added; ${updatedCount} updated; ${skippedCount} unchanged.`,
    );
  } catch (error) {
    setErrorMessage(error.message || "Unable to add the selected courses.");
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
  search.placeholder =
    select.name === "teacher_id" || select.id === "editTeacherSelect"
      ? "Search teachers..."
      : "Search options...";
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

// update status on the API
let editingSubjectRecord = null;

function copyEditOptions(targetId, sourceId, emptyLabel) {
  const target = document.getElementById(targetId);
  const source = document.getElementById(sourceId);
  target.replaceChildren();
  if (emptyLabel) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = emptyLabel;
    target.appendChild(empty);
  }
  [...source.options]
    .filter((option) => option.value)
    .forEach((option) => target.appendChild(option.cloneNode(true)));
}

function ensureEditOption(select, value, label) {
  if (!value || select.querySelector(`option[value="${value}"]`)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.appendChild(option);
}

async function editStudentSubject(id) {
  try {
    const response = await fetch(`/api/studentsubject/${id}`);
    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to load student course.");
    }
    const record = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    editingSubjectRecord = record;

    copyEditOptions("editSubjectSelect", "selectSubject", "Select course");
    copyEditOptions("editTeacherSelect", "selectTeacher", "Select teacher");
    copyEditOptions("editRoomSelect", "selectRoom", "No room");
    const subjectSelect = document.getElementById("editSubjectSelect");
    const teacherSelect = document.getElementById("editTeacherSelect");
    const roomSelect = document.getElementById("editRoomSelect");
    ensureEditOption(
      subjectSelect,
      record.subject_id,
      `${record.subject_code} — ${record.subject_name}`,
    );
    ensureEditOption(teacherSelect, record.teacher_id, record.teacher_name);
    ensureEditOption(roomSelect, record.room_id, record.room);
    subjectSelect.value = record.subject_id;
    teacherSelect.value = record.teacher_id;
    roomSelect.value = record.room_id || "";
    document.getElementById("editScheduleCode").value =
      record.schedule_code || "";
    document.getElementById("editTimeStart").value = String(
      record.time_start || "",
    ).slice(0, 5);
    document.getElementById("editTimeEnd").value = String(
      record.time_end || "",
    ).slice(0, 5);
    document.getElementById("editDay").value = record.day || "";
    document.getElementById("editSubjectContext").textContent =
      `${record.student_number} — ${record.student_name}`;
    [subjectSelect, teacherSelect, roomSelect].forEach(syncSearchableSelect);
    toggleModal("editSubjectModal", true);
  } catch (error) {
    setErrorMessage(error.message || "Unable to load student course.");
  }
}

document
  .getElementById("editStudentSubjectForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (
      !editingSubjectRecord ||
      !(await satpConfirm("Save these course changes?"))
    )
      return;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch("/api/studentsubject/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          id: editingSubjectRecord.id,
          student_id: editingSubjectRecord.student_id,
          school_year_id: editingSubjectRecord.school_year_id,
          semester_id: editingSubjectRecord.semester_id,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to update student course.");
      }
      toggleModal("editSubjectModal", false);
      await Promise.all([loadIncludedData(), loadExcludedData()]);
      setSuccessMessage(payload.message);
    } catch (error) {
      setErrorMessage(error.message || "Unable to update student course.");
    }
  });

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

  if (
    await satpConfirm("Exclude this student's course?", {
      title: "Exclude student course",
      confirmText: "Exclude",
    })
  ) {
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
    fetch("/api/schoolyear/all/active"),
    fetch("/api/schoolyear/current"),
  ]);
  const data = await allResponse.json();
  const currentData = await currentResponse.json();
  const rows = data.data || [];
  const current = currentData.data;
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
  const [response, currentResponse] = await Promise.all([
    fetch("/api/semester/all/active"),
    fetch("/api/semester/current/admin"),
  ]);
  const [data, currentData] = await Promise.all([
    response.json(),
    currentResponse.json(),
  ]);
  const rows = data.data || [];

  rows.forEach((row) => {
    semesterList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    semesterList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
  const currentSemester = rows.find(
    (row) => Number(row.id) === Number(currentData.data?.id),
  );
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
    optionRow += `<option data-subtext="${row.code}" value="${row.id}">${row.code} — ${row.name}</option>`;
  });
  subjectList.innerHTML += optionRow;
};

// Get teacher from API
const getTeacher = async () => {
  const teacherList = document.querySelector("#selectTeacher");
  const endpoint = `/api/teacher`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  importTeachersByName = new Map();
  rows.forEach((row) => {
    const key = teacherImportKey(row.givenname, row.surname);
    if (!key) return;
    importTeachersByName.set(key, row);
  });
  var optionRow = "";
  rows.filter((row) => Number(row.is_active) === 1).forEach((row) => {
    optionRow += `<option value="${row.id}">${row.name}</option>`;
  });
  teacherList.innerHTML += optionRow;
};

// Get student from API
const getStudent = async () => {
  const studentList = document.querySelector("#selectStudent");
  const endpoint = `/api/student`,
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  importStudentsByNumber = new Map(
    rows.map((row) => [normalizeImportValue(row.username), row]),
  );
  var optionRow = "";
  rows.filter((row) => Number(row.is_active) === 1).forEach((row) => {
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
const validateFileButton = document.getElementById("validateFileButton");

function setImportProgress(eyebrow, status, detail) {
  document.getElementById("progressEyebrow").textContent = eyebrow;
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = status;
  statusMessage.hidden = !status;
  document.getElementById("progressDetail").textContent = detail;
  const progress = Math.max(
    0,
    Math.min(100, Number.parseFloat(String(status).replace("%", "")) || 0),
  );
  const track = document.getElementById("validationProgressTrack");
  document.getElementById("validationProgressBar").style.width = `${progress}%`;
  track.setAttribute("aria-valuenow", String(progress));
}

function waitForPaint() {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
}

async function refreshWorkbookReferences() {
  setImportProgress(
    "Refreshing database records",
    "5%",
    "Loading the latest students, teachers, courses, rooms, and academic periods.",
  );
  await waitForPaint();

  const endpoints = [
    "/api/student",
    "/api/teacher",
    "/api/subject",
    "/api/room",
    "/api/schoolyear/",
    "/api/semester/all/active",
  ];
  const responses = await Promise.all(endpoints.map((endpoint) => fetch(endpoint)));
  const failed = responses.find((response) => !response.ok);
  if (failed) throw new Error("Unable to refresh workbook validation data.");
  const [students, teachers, subjects, rooms, schoolYears, semesters] =
    await Promise.all(responses.map((response) => response.json()));

  importStudentsByNumber = new Map(
    (students.data || []).map((row) => [normalizeImportValue(row.username), row]),
  );
  importTeachersByName = new Map();
  (teachers.data || []).forEach((row) => {
    const key = teacherImportKey(row.givenname, row.surname);
    if (key) importTeachersByName.set(key, row);
  });
  importSubjectsByCode = new Map(
    (subjects.data || []).map((row) => [normalizeImportValue(row.code), row]),
  );
  importRoomsByCode = new Map(
    (rooms.data || []).map((row) => [normalizeImportValue(row.name), row]),
  );
  importSchoolYearsByName = new Map(
    (schoolYears.data || []).map((row) => [normalizeImportValue(row.name), Number(row.id)]),
  );
  importSemestersByName = new Map(
    (semesters.data || []).map((row) => [normalizeImportValue(row.name), Number(row.id)]),
  );
  importSemesterIds = new Map(
    (semesters.data || []).map((row) => [String(Number(row.id)), Number(row.id)]),
  );
}

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
  XLSX.utils.book_append_sheet(book, sheet, "Student Courses");
  XLSX.writeFile(book, "student_subject_import_template.xlsx");
});

uploadFileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedFile = xlsxInput.files[0];
  if (!selectedFile) return;
  validateFileButton.disabled = true;
  toggleModal("importFileModal", false);
  setImportProgress(
    "Validating workbook",
    "",
    "Checking the spreadsheet and resolving its records.",
  );
  setTimeout(() => toggleModal("spinnerStatusModal", true), 200);
  try {
    await new Promise((resolve) => setTimeout(resolve, 260));
    await waitForPaint();
    await refreshWorkbookReferences();
    const rows = await parseWorkbook(selectedFile);
    pendingSubjectImport = await classifySubjectRows(rows);
    renderSubjectImportPreview();
    toggleModal("spinnerStatusModal", false);
    setTimeout(() => toggleModal("importPreviewModal", true), 250);
  } catch (error) {
    toggleModal("spinnerStatusModal", false);
    setErrorMessage(error.message || "Unable to validate the Excel file.");
    setTimeout(() => toggleModal("importFileModal", true), 250);
  } finally {
    validateFileButton.disabled = false;
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

function comparableImportTime(value) {
  const normalized = normalizeImportTime(value);
  const twentyFourHour = normalized.match(/^(\d{1,2}):(\d{2})/);
  if (!twentyFourHour) return normalized;
  return `${String(Number(twentyFourHour[1])).padStart(2, "0")}:${twentyFourHour[2]}`;
}

function isTbaTeacherRow(row) {
  const values = [
    readImportColumn(row, "InstructorID", "TeacherID"),
    readImportColumn(row, "TeacherFirstName"),
    readImportColumn(row, "TeacherMiddleName"),
    readImportColumn(row, "TeacherLastName"),
    readImportColumn(row, "Teacher", "TeacherName", "Instructor"),
  ];
  return values.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    return ["tba", "tobeannounced", "tobeassigned"].includes(normalized);
  });
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

async function classifySubjectRows(rows) {
  const seen = new Set();
  const result = { created: [], updated: [], errors: [] };

  for (let index = 0; index < rows.length; index++) {
    const raw = rows[index];
    if (index % 25 === 0 || index === rows.length - 1) {
      const progress = rows.length
        ? 10 + Math.round((index / rows.length) * 60)
        : 70;
      const remaining = rows.length - index;
      setImportProgress(
        "Validating workbook",
        `${progress}%`,
        `Checking row ${Math.min(index + 1, rows.length)} of ${rows.length}; ${remaining} remaining.`,
      );
      await waitForPaint();
    }
    const studentNumber = readImportColumn(raw, "StudentID", "IDNumber");
    const student = importStudentsByNumber.get(
      normalizeImportValue(studentNumber),
    );
    const isChsStudent = normalizeImportValue(student?.college) === "chs";
    const schoolYear = readImportColumn(raw, "SchoolYear");
    const semesterValue = readImportColumn(raw, "semester_id", "Semester");
    const subjectCode = readImportColumn(raw, "SubjectCode");
    const subjectName = readImportColumn(raw, "Description", "SubjectDescription");
    const subject = importSubjectsByCode.get(normalizeImportValue(subjectCode));
    const teacherFirstName = readImportColumn(raw, "TeacherFirstName");
    const teacherLastName = readImportColumn(raw, "TeacherLastName");
    const teacher = importTeachersByName.get(
      teacherImportKey(teacherFirstName, teacherLastName),
    );
    const roomCode = readImportColumn(raw, "RoomCode");
    const room = importRoomsByCode.get(normalizeImportValue(roomCode));
    if (isTbaTeacherRow(raw)) {
      result.errors.push({
        rowNumber: index + 2,
        originalRow: raw,
        reason: "Teacher is TBA",
      });
      continue;
    }
    const resolved = {
      student_id: student?.id,
      student_number: String(studentNumber || "").trim(),
      is_chs: isChsStudent,
      student_needs_activation:
        student != null && Number(student.is_active) !== 1,
      school_year_id: importSchoolYearsByName.get(normalizeImportValue(schoolYear)),
      semester_id:
        importSemesterIds.get(String(Number(semesterValue))) ||
        importSemestersByName.get(normalizeImportValue(semesterValue)),
      subject_id: subject?.id || null,
      subject_code: String(subjectCode || "").trim(),
      subject_name: String(subjectName || subject?.name || "").trim(),
      subject_needs_creation: !subject && Boolean(subjectCode && subjectName),
      subject_needs_activation:
        subject != null && Number(subject.is_active) !== 1,
      teacher_id: teacher?.id,
      teacher_needs_activation:
        teacher != null && Number(teacher.is_active) !== 1,
      room_id: room?.id || null,
      room_code: String(roomCode || "").trim(),
      room_needs_creation: Boolean(roomCode) && !room,
      room_needs_activation: room != null && Number(room.is_active) !== 1,
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
    if (!resolved.subject_id && !resolved.subject_needs_creation)
      missing.push("course code and description");
    if (!resolved.teacher_id) missing.push("teacher");
    if (roomCode && !resolved.room_id && !resolved.room_needs_creation)
      missing.push("room");
    const key = [
      resolved.student_id,
      resolved.school_year_id,
      resolved.semester_id,
      resolved.subject_id || normalizeImportValue(resolved.subject_code),
      ...(isChsStudent
        ? [normalizeImportValue(resolved.schedule_code), resolved.teacher_id]
        : []),
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
        reason: "Duplicate student course in file",
      });
    } else {
      seen.add(key);
      const dependencyActions = [];
      if (item.subject_needs_creation) dependencyActions.push("course will be created");
      else if (item.subject_needs_activation)
        dependencyActions.push("course will be reactivated");
      if (item.room_needs_creation) dependencyActions.push("room will be created");
      else if (item.room_needs_activation)
        dependencyActions.push("room will be reactivated");
      if (dependencyActions.length) item.reason = dependencyActions.join("; ");
      result.created.push(item);
    }
  }

  const enrollmentGroups = new Map();
  result.created.forEach((item) => {
    const key = `${item.student_id}|${item.school_year_id}|${item.semester_id}`;
    if (!enrollmentGroups.has(key)) enrollmentGroups.set(key, []);
    enrollmentGroups.get(key).push(item);
  });

  const existingKeys = new Set();
  const periodRequests = new Map();
  const enrollmentBatches = [...enrollmentGroups.values()];
  let checkedBatches = 0;
  setImportProgress(
    "Checking existing enrollments",
    "70%",
    `${enrollmentBatches.length} enrollment group${enrollmentBatches.length === 1 ? "" : "s"} remaining.`,
  );
  await waitForPaint();
  await Promise.all(
    enrollmentBatches.map(async (items) => {
      const sample = items[0];
      const periodKey = `${sample.school_year_id}|${sample.semester_id}`;
      if (!periodRequests.has(periodKey)) {
        periodRequests.set(
          periodKey,
          fetch(
            `/api/studentsubject/period/school_year_id=${sample.school_year_id}&semester_id=${sample.semester_id}`,
          ).then(async (response) => {
            if (!response.ok) {
              throw new Error("Unable to check existing enrollments.");
            }
            const payload = await response.json();
            const recordsByStudent = new Map();
            (payload.data || []).forEach((record) => {
              const studentId = Number(record.student_id);
              if (!recordsByStudent.has(studentId)) recordsByStudent.set(studentId, []);
              recordsByStudent.get(studentId).push(record);
            });
            return recordsByStudent;
          }),
        );
      }
      const recordsByStudent = await periodRequests.get(periodKey);
      const isChsStudent = Boolean(sample.is_chs);
      const enrollmentKey = (record) => isChsStudent
        ? [Number(record.subject_id), normalizeImportValue(record.schedule_code),
          Number(record.teacher_id)].join("|")
        : String(Number(record.subject_id));
      const existingByEnrollment = new Map(
        (recordsByStudent.get(Number(sample.student_id)) || [])
          .map((record) => [enrollmentKey(record), record]),
      );
      items.forEach((item) => {
        const current = existingByEnrollment.get(enrollmentKey(item));
        if (!current) return;
        const unchanged =
          comparableImportTime(current.time_start) ===
            comparableImportTime(item.time_start) &&
          comparableImportTime(current.time_end) ===
            comparableImportTime(item.time_end) &&
          normalizeImportValue(current.day) === normalizeImportValue(item.day) &&
          Number(current.room_id || 0) === Number(item.room_id || 0) &&
          Number(current.is_excluded || 0) === Number(item.is_excluded || 0);
        const key = `${item.student_id}|${item.school_year_id}|${item.semester_id}|${enrollmentKey(item)}`;
        existingKeys.add(key);
        result.updated.push({
          ...item,
          id: current.id,
          unchanged,
          reason: unchanged
            ? "Enrollment already exists; no changes needed"
            : "Enrollment already exists; changes will be updated",
        });
      });
      checkedBatches++;
      const remaining = enrollmentBatches.length - checkedBatches;
      const progress = enrollmentBatches.length
        ? 70 + Math.round((checkedBatches / enrollmentBatches.length) * 30)
        : 100;
      setImportProgress(
        "Checking existing enrollments",
        `${progress}%`,
        `${remaining} enrollment group${remaining === 1 ? "" : "s"} remaining.`,
      );
      await waitForPaint();
    }),
  );
  result.created = result.created.filter(
    (item) =>
      !existingKeys.has(
        `${item.student_id}|${item.school_year_id}|${item.semester_id}|${
          item.is_chs
            ? [Number(item.subject_id), normalizeImportValue(item.schedule_code), Number(item.teacher_id)].join("|")
            : String(Number(item.subject_id))}`,
      ),
  );

  setImportProgress(
    "Validation complete",
    "100%",
    `${rows.length} row${rows.length === 1 ? "" : "s"} checked.`,
  );
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
    !pendingSubjectImport.created.length &&
    !pendingSubjectImport.updated.length &&
    !pendingSubjectImport.errors.length;
}

document
  .getElementById("runImportButton")
  .addEventListener("click", async () => {
    const errors = pendingSubjectImport.errors.map((item) => ({
      ...item.originalRow,
      Error: item.reason,
    }));

    toggleModal("importPreviewModal", false);
    const actionableItems = [
      ...pendingSubjectImport.created,
      ...pendingSubjectImport.updated,
    ];
    if (!actionableItems.length) {
      downloadSubjectImportErrors(errors);
      return setErrorMessage(`${errors.length} invalid rows exported.`);
    }
    setImportProgress(
      "Import in progress",
      "0%",
      "Please keep this page open.",
    );
    setTimeout(() => toggleModal("spinnerStatusModal", true), 250);

    const failedSubjectCodes = new Set();
    const failedRoomCodes = new Set();
    const subjectDependencies = new Map();
    const roomDependencies = new Map();
    actionableItems.forEach((item) => {
      if (item.subject_needs_creation || item.subject_needs_activation) {
        subjectDependencies.set(normalizeImportValue(item.subject_code), item);
      }
      if (item.room_needs_creation || item.room_needs_activation) {
        roomDependencies.set(normalizeImportValue(item.room_code), item);
      }
    });

    for (const [codeKey, item] of subjectDependencies) {
      try {
        setImportProgress(
          "Preparing courses",
          "Please wait",
          `${item.subject_needs_creation ? "Creating" : "Reactivating"} ${item.subject_code}.`,
        );
        const response = await fetch(
          item.subject_needs_creation ? "/api/subject/add" : "/api/subject/update",
          {
            method: item.subject_needs_creation ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.subject_id,
              code: item.subject_code,
              name: item.subject_name,
              is_active: 1,
              user_id: user,
            }),
          },
        );
        const payload = await response.json();
        if (!response.ok || !payload.success)
          throw new Error(payload.message || "Course could not be prepared");
      } catch (error) {
        failedSubjectCodes.add(codeKey);
      }
    }

    for (const [codeKey, item] of roomDependencies) {
      try {
        setImportProgress(
          "Preparing rooms",
          "Please wait",
          `${item.room_needs_creation ? "Creating" : "Reactivating"} ${item.room_code}.`,
        );
        const response = await fetch(
          item.room_needs_creation ? "/api/room/add" : "/api/room/update",
          {
            method: item.room_needs_creation ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.room_id,
              name: item.room_code,
              is_active: 1,
              user_id: user,
            }),
          },
        );
        const payload = await response.json();
        if (!response.ok || !payload.success)
          throw new Error(payload.message || "Room could not be prepared");
      } catch (error) {
        failedRoomCodes.add(codeKey);
      }
    }

    if (subjectDependencies.size || roomDependencies.size) {
      await refreshWorkbookReferences();
      actionableItems.forEach((item) => {
        const subject = importSubjectsByCode.get(
          normalizeImportValue(item.subject_code),
        );
        const room = importRoomsByCode.get(normalizeImportValue(item.room_code));
        if (subject) item.subject_id = subject.id;
        if (room) item.room_id = room.id;
      });
    }

    const inactiveStudentIds = [
      ...new Set(
        actionableItems
          .filter((item) => item.student_needs_activation)
          .map((item) => Number(item.student_id)),
      ),
    ];
    const failedStudentIds = new Set();
    for (const studentId of inactiveStudentIds) {
      try {
        setImportProgress(
          "Activating matched students",
          "Please wait",
          "An inactive student from the workbook is being reactivated.",
        );
        const response = await fetch("/api/student/update/status", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: studentId, is_active: 1 }),
        });
        if (!response.ok) throw new Error("Student could not be activated");
        for (const student of importStudentsByNumber.values()) {
          if (Number(student.id) === studentId) student.is_active = 1;
        }
      } catch (error) {
        failedStudentIds.add(studentId);
      }
    }

    const inactiveTeacherIds = [
      ...new Set(
        actionableItems
          .filter((item) => item.teacher_needs_activation)
          .map((item) => Number(item.teacher_id)),
      ),
    ];
    const failedTeacherIds = new Set();
    for (const teacherId of inactiveTeacherIds) {
      try {
        setImportProgress(
          "Activating matched teachers",
          "Please wait",
          "An inactive teacher from the workbook is being reactivated.",
        );
        const response = await fetch("/api/teacher/activate", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: teacherId }),
        });
        if (!response.ok) throw new Error("Teacher could not be activated");
        for (const teacher of importTeachersByName.values()) {
          if (Number(teacher.id) === teacherId) teacher.is_active = 1;
        }
      } catch (error) {
        failedTeacherIds.add(teacherId);
      }
    }

    const importableItems = actionableItems.filter((item) => {
      if (
        failedSubjectCodes.has(normalizeImportValue(item.subject_code)) ||
        !item.subject_id
      ) {
        errors.push({
          ...item.originalRow,
          Error: "Course could not be created or reactivated",
        });
        return false;
      }
      if (
        item.room_code &&
        (failedRoomCodes.has(normalizeImportValue(item.room_code)) ||
          !item.room_id)
      ) {
        errors.push({
          ...item.originalRow,
          Error: "Room could not be created or reactivated",
        });
        return false;
      }
      if (failedStudentIds.has(Number(item.student_id))) {
        errors.push({
          ...item.originalRow,
          Error: "Matched student could not be activated",
        });
        return false;
      }
      if (!failedTeacherIds.has(Number(item.teacher_id))) return true;
      errors.push({
        ...item.originalRow,
        Error: "Matched teacher could not be activated",
      });
      return false;
    });
    const groups = new Map();
    importableItems.forEach((item) => {
      const key = `${item.student_id}|${item.school_year_id}|${item.semester_id}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    if (!groups.size) {
      toggleModal("spinnerStatusModal", false);
      downloadSubjectImportErrors(errors);
      return setErrorMessage("No student courses could be imported.");
    }
    setImportProgress(
      "Import in progress",
      "0%",
      "Please keep this page open.",
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const groupEntries = [...groups.values()];
    const IMPORT_CONCURRENCY = 6;
    let nextGroupIndex = 0;
    let completedGroups = 0;

    const processGroup = async (items) => {
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
        if (!response.ok) {
          throw new Error(payload.message || "Server rejected rows");
        }
        created += (payload.data?.created || []).length;
        updated += (payload.data?.updated || []).length;
        skipped += (payload.data?.skipped || []).length;
      } catch (error) {
        items.forEach((item) =>
          errors.push({
            ...item.originalRow,
            Error: error.message || "Import request failed",
          }),
        );
      } finally {
        completedGroups++;
        const progress = Math.round((completedGroups / groupEntries.length) * 100);
        setImportProgress(
          "Import in progress",
          `${progress}%`,
          `${completedGroups} of ${groupEntries.length} student enrollment groups processed.`,
        );
      }
    };

    const worker = async () => {
      while (nextGroupIndex < groupEntries.length) {
        const index = nextGroupIndex++;
        await processGroup(groupEntries[index]);
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(IMPORT_CONCURRENCY, groupEntries.length) },
        () => worker(),
      ),
    );

    toggleModal("spinnerStatusModal", false);
    if (errors.length) downloadSubjectImportErrors(errors);
    await loadCurrentPeriodData();
    setTimeout(
      () =>
        setSuccessMessage(
          `${created} created, ${updated} updated, ${skipped} unchanged${
            errors.length ? `, ${errors.length} failed rows exported` : ""
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
  const overlaySidebar = window.innerWidth <= 1100;
  document.getElementById("mySidenav").style.width = "280px";
  document.getElementById("main").style.marginLeft = overlaySidebar ? "0" : "280px";
  const footer = document.querySelector("#main .site-footer");
  if (footer) footer.style.marginLeft = overlaySidebar ? "0" : "280px";
  nav = true;
}

var nav = false;

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
  const footer = document.querySelector("#main .site-footer");
  if (footer) footer.style.marginLeft = "0";
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
    setTimeout(() => {
      modal.classList.add("invisible");
      resetModalInputs(modal, id);
    }, 250);
    document.body.classList.remove("overflow-hidden");
  }
}

function resetModalInputs(modal, id) {
  const forms = [...modal.querySelectorAll("form")];
  if (!forms.length) return;

  forms.forEach((form) => form.reset());
  modal
    .querySelectorAll(".search-select")
    .forEach((wrapper) => wrapper.classList.remove("open"));
  modal
    .querySelectorAll(".search-select-search")
    .forEach((input) => (input.value = ""));
  modal.querySelectorAll("select").forEach(syncSearchableSelect);

  if (id === "addNewModal") {
    document.getElementById("subjectRows")?.replaceChildren();
  }
  if (id === "importFileModal") {
    const fileDescription = document.querySelector("#dropZone p");
    if (fileDescription) {
      fileDescription.textContent =
        "Use the downloadable template for the required columns";
    }
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

function loadSpinner(message = "Loading student courses") {
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
