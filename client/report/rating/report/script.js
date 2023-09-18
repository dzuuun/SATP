const baseURL = "http://localhost:3000";
const user = localStorage.getItem("user_id");
const tbody = document.querySelector("#tbData");
const comment = document.getElementById("comments");
const category = document.getElementById("category");
var genSchoolYear = localStorage.getItem("genReportSchoolYear");
var genSemester = localStorage.getItem("genReportSemester");
var genTeacher = localStorage.getItem("genReportteacher");
var genSubject = localStorage.getItem("genReportSubject");
var genReport = localStorage.getItem("genReport");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const college = document.querySelector("#college");
const department = document.querySelector("#department");
const dateGenerated = document.querySelector("#dateGenerated");
const respondents = document.getElementById("respondents");
const teacher = document.querySelector("#teacher");
const subject = document.getElementById("subject");
const generalMean = document.getElementById("generalMean");
const ratingHeader = document.getElementById("ratingHeader");
var today = new Date();
let itemAverage = [];
let meanAverage = [];
averagePerSubjectTotal = [];

switch (genReport) {
  case "collegiate":
    ratingHeader.innerHTML = `Collegiate Rating Report`;
    break;
  case "departmental":
    ratingHeader.innerHTML = `Departmental Rating Report`;
    break;
  case "institutional":
    ratingHeader.innerHTML = `Institutional Rating Report`;
    break;
  case "individual":
    ratingHeader.innerHTML = `Individual Rating Report`;
    break;
}

const getdata = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    teacher_id: genTeacher,
    subject_id: genSubject,
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
        window.location.href = `../index.html`;
      } else {
        var result = response.data.reduce((x, y) => {
          (x[y.category] = x[y.category] || []).push(y);
          return x;
        }, {});
        console.log(result);
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
        tbody.innerHTML += `<th class="text-end" scope="row" >Total Average: </th>
        <td class="fw-bold">${average(averagePerSubjectTotal).toFixed(2)}</td>
        `;

        averagePerSubjectTotal = [];

        subject.innerHTML = `${response.data[0].subject}`;
        respondents.innerHTML = `${response.data[0].respondents}`;

        meanAverage = [];
      }
    });
};

getdata();

const getTeacherInfo = async () => {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
    teacher_id: genTeacher,
  };

  fetch(`${baseURL}/api/report/rating/teacher/information`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(query),
  })
    .then((res) => res.json())
    .then((response) => {
      teacher.innerHTML = `${response.data.teacher_name}`;
      school_year.innerHTML = `${response.data.school_year}`;
      semester.innerHTML = `${response.data.semester}`;
      college.innerHTML = `${response.data.college}`;
      department.innerHTML = `${response.data.department}`;
      dateGenerated.innerHTML = `${today.toDateString()}`;
      generalMean.innerHTML = `${response.data.mean.toFixed(2)}`;
    });
};

getTeacherInfo();

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
