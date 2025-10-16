
const user = localStorage.getItem("user_id");
const tbody = document.querySelector("#tbData");
const comment = document.getElementById("comments");
const category = document.getElementById("category");
var genSchoolYear = localStorage.getItem("genReportSchoolYear");
var genSemester = localStorage.getItem("genReportSemester");
var genCollege = localStorage.getItem("genReportCollege");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const college = document.querySelector("#college");
const department = document.querySelector("#department");
const dateGenerated = document.querySelector("#dateGenerated");
const respondents = document.getElementById("respondents");

var today = new Date();
let itemAverage = [];
let meanAverage = [];
averagePerSubjectTotal = [];

const getdata = async () => {
  loadSpinner();
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    college_id: genCollege,
  };

  await fetch(`/api/report/rating/collegiate`, {
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
        school_year.innerHTML = `${response.data[0].school_year}`;
        semester.innerHTML = `${response.data[0].semester}`;
        college.innerHTML = `${response.data[0].college}`;
        dateGenerated.innerHTML = `${today.toDateString()}`;
        var result = response.data.reduce((x, y) => {
          (x[y.category] = x[y.category] || []).push(y);
          return x;
        }, {});
        for (let i = 0; i < Object.keys(result).length; i++) {
          tbody.innerHTML += `<th class="text-start" scope="row" colspan="2">${
            Object.values(result)[i][0].category
          }</th>`;

          for (let j = 0; j < Object.values(result)[i].length; j++) {
            meanAverage.push(Object.values(result)[i][j].mean);
            itemAverage.push(Object.values(result)[i][j].mean);
            averagePerSubjectTotal.push(Object.values(result)[i][j].mean);

            tbody.innerHTML += `<tr>
                        <td class="text-start text-wrap">${
                          Object.values(result)[i][j].number
                        }. ${Object.values(result)[i][j].question}</td>
                        <td>${Object.values(result)[i][j].mean.toFixed(2)}</td>
                    </tr>`;
          }
          tbody.innerHTML += `<th class="text-end" scope="row">Category Average: </th>
          <td class="fw-bold">${average(itemAverage).toFixed(2)}</td>`;
          itemAverage = [];
        }
        tbody.innerHTML += `<th class="text-end" scope="row" >College Average: </th>
        <td class="fw-bold">${average(averagePerSubjectTotal).toFixed(2)}</td>
        `;

        averagePerSubjectTotal = [];
        respondents.innerHTML = `${response.data[0].respondents}`;

        meanAverage = [];
        hideSpinner();
      }
    });
};

getdata();

const getComment = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    college_id: genCollege,
  };

  await fetch(`/api/report/rating/comment/collegiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      response.data.forEach((data) => {
        comment.innerHTML += `<div class="row align-items-start"> <div class="col">
            ${data.comment}
          </div>
          <hr/> 
        </div>
        `;
      });
    });
};

getComment();

function average(numbers) {
  let sum = numbers.reduce((accumulator, currentValue) => {
    return accumulator + currentValue;
  }, 0);
  let avg = sum / numbers.length;
  return avg;
}

document.addEventListener("DOMContentLoaded", function () {
  loadSpinner();

  window.addEventListener("load", function () {
    hideSpinner();
  });
});

function loadSpinner() {
  document.getElementById("overlay").style.display = "flex";
}

function hideSpinner() {
  document.getElementById("overlay").style.display = "none";
}
