const tbody = document.querySelector("#tbData");
const school_year = document.querySelector("#school_year");
const semester = document.querySelector("#semester");

var today = new Date();


const getdata = async () => {
  const endpoint = "http://localhost:3000/api/report/ranking/overall",
    response = await fetch(endpoint),
    data = await response.json(),
    row = data.data;

  row.forEach((data) => {
    tbody.innerHTML += `<tr>
      
        <td>${data.teacher_name}</td>
        <td>${data.department}</td>
        <td>${data.college}</td>
        <td>${data.mean}</td>
    </tr>`;
  });
  school_year.innerHTML += `School Year: ${row[0].school_year} <br> Semester: ${row[0].semester} <br> Date Generated: ${today.toDateString()}`;
};
getdata();
