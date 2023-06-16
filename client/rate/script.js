const table1 = document.querySelector("#table1");
const table2 = document.querySelector("#table2");
const table3 = document.querySelector("#table3");
const table4 = document.querySelector("#table4");
const table5 = document.querySelector("#table5");


const getdata = async () => {
  const endpoint = "http://localhost:3000/api/item/active/rate",
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  var result = rows.reduce((x, y) => {
    (x[y.category] = x[y.category] || []).push(y);
    return x;
  }, {});

  // console.log(rows);
  // console.log(result.TEACHER);
  // console.log(result["TEACHING PROCEDURES"]);
  // console.log(result.STUDENTS);
  // console.log(result.METHODOLOGY);
  // console.log(result["GENERAL OBSERVATION"]);

  result.TEACHER.forEach((row) => {
    table1.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
      <div class="col-md text-nowrap fs-4">
      <i value="1" class="bi bi-star"></i>
      <i value="2" class="bi bi-star"></i>
      <i value="3" class="bi bi-star"></i>
      <i value="4" class="bi bi-star"></i>
      <i value="5" class="bi bi-star"></i>
    </div>     
      </td> 
    </tr>`;
  });

  result["TEACHING PROCEDURES"].forEach((row) => {
    table2.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
      <div class="col-md text-nowrap fs-4">
      <i value="1" class="bi bi-star"></i>
      <i value="2" class="bi bi-star"></i>
      <i value="3" class="bi bi-star"></i>
      <i value="4" class="bi bi-star"></i>
      <i value="5" class="bi bi-star"></i>
    </div>   
      </td> 
    </tr>`;
  });

  result.STUDENTS.forEach((row) => {
    table3.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
      <div class="col-md text-nowrap fs-4">
      <i value="1" class="bi bi-star"></i>
      <i value="2" class="bi bi-star"></i>
      <i value="3" class="bi bi-star"></i>
      <i value="4" class="bi bi-star"></i>
      <i value="5" class="bi bi-star"></i>
    </div>     
      </td> 
    </tr>`;
  });

  result.METHODOLOGY.forEach((row) => {
    table4.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
      <div class="col-md text-nowrap fs-4">
      <i value="1" class="bi bi-star"></i>
      <i value="2" class="bi bi-star"></i>
      <i value="3" class="bi bi-star"></i>
      <i value="4" class="bi bi-star"></i>
      <i value="5" class="bi bi-star"></i>
    </div>   
      </td> 
    </tr>`;
  });

  result["GENERAL OBSERVATION"].forEach((row) => {
    table5.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
      <div class="col-md text-nowrap fs-4">
      <i value="1" class="bi bi-star"></i>
      <i value="2" class="bi bi-star"></i>
      <i value="3" class="bi bi-star"></i>
      <i value="4" class="bi bi-star"></i>
      <i value="5" class="bi bi-star"></i>
    </div>     
      </td> 
    </tr>`;
  });
};
getdata();

const school_year = document.querySelector("#schoolYear");
school_year.innerHTML += `2019-2020`;

const semester = document.querySelector("#semester");
semester.innerHTML += `First Semester`;

const studentRater = document.querySelector("#studentRater");
studentRater.innerHTML += `Student Name`;

const teacherRatee = document.querySelector("#teacherRatee");
teacherRatee.innerHTML += `Teacher Name`;
const subjectCode = document.querySelector("#subjectCode");
subjectCode.innerHTML += `Subject Code`;
