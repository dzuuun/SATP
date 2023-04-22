const tbody = document.querySelector("#tbData");

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/item",
    response = await fetch(endpoint),
    data = await response.json(),
    departments = data.data;

    var result = departments.reduce((x, y) => {
        (x[y.category] = x[y.category] || []).push(y);
        return x;
    }, {});

    console.log(departments)
    console.log(result.TEACHER)
    console.log(result['TEACHING PROCEDURES']);
    console.log(result.STUDENTS)
    console.log(result.METHODOLOGY)
    console.log(result['GENERAL OBSERVATION']);
    
  departments.forEach((row) => {
    tbody.innerHTML += `
    <tr id="${row.id}">
      <td class="text-center">${row.number}</td>
        <td class="text-wrap fs-6">${row.question}</td>
      <td>
        <div class="col-md text-nowrap fs-5">
          <i class="bi bi-star"></i>
          <i class="bi bi-star"></i>
          <i class="bi bi-star"></i>
          <i class="bi bi-star"></i>
          <i class="bi bi-star"></i>
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