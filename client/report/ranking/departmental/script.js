const baseURL = "http://120.72.27.137:3000";
const tbody = document.querySelector("#tbData");
var genSchoolYear = localStorage.getItem("genReportSchoolYear");
var genSemester = localStorage.getItem("genReportSemester");
var genTeachingStatus = localStorage.getItem("genReportTeachingStatus");
var genDepartment = localStorage.getItem("genReportDepartment");
const header = document.getElementById("header");
const collegeHeader = document.getElementById("collegeHeader");
const departmentHeader = document.getElementById("departmentHeader");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const dateGenerated = document.querySelector("#dateGenerated");
const mean = document.getElementById("mean");
var department;
var today = new Date();
let meanAverage = [];

function getDepartmentData() {
  fetch(`${baseURL}/api/department/` + genDepartment, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((response) => {
      department = response.data.code;
    });
}
getDepartmentData();

const getdata = async () => {
  loadSpinner();
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    is_part_time: genTeachingStatus,
    departments_id: genDepartment,
  };

  fetch(`${baseURL}/api/report/ranking/departmental`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.count === 0) {
        alert("no data found");
        window.location.href = `../index.html`;
      } else {
        if (response.data[0].is_part_time === 0) {
          header.innerHTML =
            "DEPARTMENTAL RANKING RESULT OF TEACHERS WITH FULL-TIME LOAD";
        } else {
          header.innerHTML =
            "DEPARTMENTAL RANKING RESULT OF TEACHERS WITH PART-TIME LOAD";
        }
        response.data.forEach((data) => {
          meanAverage.push(data.mean);
          tbody.innerHTML += `<tr>
                    <td class="col-1"></td>
                    <td class="text-capitalize">${data.teacher_name}</td>
                    <td class="text-center">${data.mean}</td>
                </tr>`;
        });
        mean.innerHTML = `Overall Mean: ${average(meanAverage).toFixed(2)}`;
        school_year.innerHTML += `${response.data[0].school_year}`;
        semester.innerHTML += `${response.data[0].semester}`;
        collegeHeader.innerHTML = `${response.data[0].college}`;
        departmentHeader.innerHTML = `${response.data[0].department}`;
        dateGenerated.innerHTML += `${today.toDateString()}`;
      }
      hideSpinner();
    });
};

function average(numbers) {
  let sum = numbers.reduce((accumulator, currentValue) => {
    return accumulator + currentValue;
  }, 0);
  let avg = sum / numbers.length;
  return avg;
}

function csvExport(table_id, separator = ",") {
  var rows = document.querySelectorAll("table#" + table_id + " tr");

  var csv = [];
  for (var i = 0; i < rows.length; i++) {
    var row = [],
      cols = rows[i].querySelectorAll("td, th");
    for (var j = 0; j < cols.length; j++) {
      var data = cols[j].innerText
        .replace(/(\r\n|\n|\r)/gm, "")
        .replace(/(\s\s)/gm, " ");
      data = data.replace(/"/g, '""');
      row.push('"' + data + '"');
    }
    csv.push(row.join(separator));
  }
  var csv_string = csv.join("\n");

  var filename =
    department + " SATP Departmental Ranking " + today.toDateString() + ".csv";
  var link = document.createElement("a");
  link.style.display = "none";
  link.setAttribute("target", "_blank");
  link.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(csv_string)
  );
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.addEventListener("DOMContentLoaded", function () {
  loadSpinner();
  getdata();

  window.addEventListener("load", function () {
    // hideSpinner();
  });
});

function loadSpinner() {
  document.getElementById("overlay").style.display = "flex";
}

function hideSpinner() {
  document.getElementById("overlay").style.display = "none";
}
