const baseURL = "http://localhost:3000";
const user = localStorage.getItem("user_id");
const tbody = document.querySelector("#tbData");
const comment = document.getElementById("comments");
const category = document.getElementById("category");
var genSchoolYear = localStorage.getItem("genReportSchoolYear");
var genSemester = localStorage.getItem("genReportSemester");
var genTeacher = localStorage.getItem("genReportteacher");
const header = document.getElementById("header");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const dateGenerated = document.querySelector("#dateGenerated");
const teacher = document.querySelector("#teacher");
const subjectCode = document.getElementById("subject_code");
var today = new Date();
let itemAverage = [];
let meanAverage = [];

const getdata = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    teacher_id: genTeacher,
  };

  fetch(`${baseURL}/api/report/rating/individual`, {
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
        // window.location.href = `../index.html`;
      } else {
        var result = response.data.reduce((x, y) => {
          (x[y.category] = x[y.category] || []).push(y);
          return x;
        }, {});

        for (let i = 0; i < Object.keys(result).length; i++) {
          tbody.innerHTML += `<th class="text-start" scope="row" colspan="3">${
            Object.values(result)[i][0].category
          }</th>`;
          for (let j = 0; j < Object.values(result)[i].length; j++) {
            meanAverage.push(Object.values(result)[i][j].mean);
            itemAverage.push(Object.values(result)[i][j].mean);

            tbody.innerHTML += `<tr>
                        <td class="text-start text-wrap">${
                          Object.values(result)[i][j].number
                        }. ${Object.values(result)[i][j].question}</td>
                        <td style="text-transform:uppercase">5</td>
                        <td style="text-transform:uppercase">${Object.values(
                          result
                        )[i][j].mean.toFixed(2)}</td>
                    </tr>`;
          }
          tbody.innerHTML += `<th class="text-end" scope="row" colspan="2">Category Average: </th>
          <td class="fw-bold">${average(itemAverage).toFixed(2)}</td>`;
          itemAverage = [];
        }
        tbody.innerHTML += `<th class="text-end" scope="row" colspan="1">Average: </th>
        <td class="fw-bold">5</td>
        <td></td>`;
        tbody.innerHTML += `<th class="text-end" scope="row" colspan="1">Mean Average: </th>
        <td  colspan="2" class="fw-bold">${average(meanAverage).toFixed(
          2
        )}</td>`;
        subjectCode.innerHTML = `${response.data[0].subject}`;

        teacher.innerHTML += `${response.data[0].teacher_name}`;
        school_year.innerHTML += `${response.data[0].school_year}`;
        semester.innerHTML += `${response.data[0].semester}`;
        dateGenerated.innerHTML += `${today.toDateString()}`;

        meanAverage = [];
      }
    });
};

getdata();

const getComment = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    teacher_id: genTeacher,
  };

  fetch(`${baseURL}/api/report/rating/comment`, {
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
        // window.location.href = `../index.html`;
      } else {
        response.data.forEach((data) => {
          comment.innerHTML += `<div class="row align-items-start"> <div class="col">
            ${data.comment}
          </div>
          <hr/> 
        </div>
        `;
        });
      }
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
