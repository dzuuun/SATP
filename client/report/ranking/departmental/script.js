const baseURL = "http://localhost:3000";
const tbody = document.querySelector("#tbData");
var genSchoolYear = sessionStorage.getItem("genReportSchoolYear");
var genSemester = sessionStorage.getItem("genReportSemester");
var genTeachingStatus = sessionStorage.getItem("genReportTeachingStatus");
var genDepartment = sessionStorage.getItem("genReportDepartment");
const header = document.getElementById("header");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const dateGenerated = document.querySelector("#dateGenerated");
var department;
var today = new Date();

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
        alert("no data found")
        window.location.href=`../../index.html`
      } else {
        if (response.data[0].is_part_time === 0) {
          header.innerHTML =
            "DEPARTMENTAL RANKING RESULT OF TEACHERS WITH FULL-TIME LOAD";
        } else {
          header.innerHTML =
            "DEPARTMENTAL RANKING RESULT OF TEACHERS WITH PART-TIME LOAD";
        }
        response.data.forEach((data) => {
          tbody.innerHTML += `<tr>
                    <td>${data.teacher_name}</td>
                    <td style="text-transform:uppercase">${data.department}</td>
                    <td style="text-transform:uppercase">${data.college}</td>
                    <td class="text-center">${data.mean}</td>
                </tr>`;
        });

        school_year.innerHTML += `${response.data[0].school_year}`;
        semester.innerHTML += `${response.data[0].semester}`;
        dateGenerated.innerHTML += `${today.toDateString()}`;
      }
    });
};

getdata();

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

  var filename = department +" SATP Departmental Ranking " + today.toDateString() + ".csv";
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