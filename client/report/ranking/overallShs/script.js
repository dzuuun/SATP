const baseURL = "http://localhost:4000";
const tbody = document.querySelector("#tbData");
var genSchoolYear = localStorage.getItem("genReportSchoolYear");
var genSemester = localStorage.getItem("genReportSemester");
var genTeachingStatus = localStorage.getItem("genReportTeachingStatus");
const header = document.getElementById("header");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const dateGenerated = document.querySelector("#dateGenerated");
const mean = document.getElementById("mean");
let meanAverage = [];

var today = new Date();

const getdata = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    is_part_time: genTeachingStatus,
  };

  await fetch(`${baseURL}/api/report/ranking/overall/shs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      loadSpinner();
      if (response.count === 0) {
        alert("no data found");
        window.location.href = `../index.html`;
      } else {
        if (response.data[0].is_part_time === 0) {
          header.innerHTML =
            "OVERALL RANKING RESULT OF TEACHERS WITH FULL-TIME LOAD";
        } else if (response.data[0].is_part_time === 1) {
          header.innerHTML =
            "OVERALL RANKING RESULT OF TEACHERS WITH PART-TIME LOAD";
        } else if (response.data[0].is_part_time === 2) {
          header.innerHTML =
            "OVERALL RANKING RESULT OF TEACHERS WITH ADMIN LOAD";
        } else {
          header.innerHTML = "OVERALL RANKING RESULT";
        }

        response.data.forEach((data) => {
          meanAverage.push(data.mean);
          tbody.innerHTML += `<tr>
                    <td></td>
                    <td class="text-capitalize">${data.teacher_name}</td>
                    <td class="text-uppercase">${data.department}</td>
                    <td class="text-uppercase">${data.college}</td>
                    <td class="text-center">${data.mean}</td>
                    <td class="text-center">${getQualitativeEquivalent(
                      data.mean
                    )}</td>
                </tr>`;
        });
        mean.innerHTML = `Overall Mean: ${average(meanAverage).toFixed(2)}`;
        school_year.innerHTML += `${response.data[0].school_year}`;
        semester.innerHTML += `${response.data[0].semester}`;
        dateGenerated.innerHTML += `${today.toDateString()}`;
      }
      hideSpinner();
    });
};

function getQualitativeEquivalent(score) {
  let equivalent;

  switch (true) {
    case score >= 1.0 && score <= 1.5:
      equivalent = "Poor";
      break;
    case score > 1.51 && score <= 2.24:
      equivalent = "Fair";
      break;
    case score > 2.25 && score <= 3.75:
      equivalent = "Satisfactory";
      break;
    case score > 3.76 && score <= 4.49:
      equivalent = "Very Satisfactory";
      break;
    case score >= 4.5 && score <= 5.0:
      equivalent = "Excellent";
      break;
    default:
      equivalent = "Invalid Score";
  }

  return equivalent;
}

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

  var filename = "SATP Overall Ranking " + today.toDateString() + ".csv";
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
