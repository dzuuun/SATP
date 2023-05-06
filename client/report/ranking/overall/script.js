const tbody = document.querySelector("#tbData");
// const school_year = document.querySelector("#school_year");
// const semester = document.querySelector("#semester");

var today = new Date();

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/report/ranking/overall/",
    response = await fetch(
      endpoint +
        new URLSearchParams({
          school_year_id: 2,
          semester_id: 1,
          is_part_time: 0,
        }).toString()
    ),
    data = await response.json(),
    row = data.data;

  row.forEach((data) => {
    tbody.innerHTML += `<tr>
      
        <td>${data.teacher_name}</td>
        <td style="text-transform:uppercase">${data.department}</td>
        <td style="text-transform:uppercase">${data.college}</td>
        <td class="text-center">${data.mean}</td>
    </tr>`;
  });
  const school_year = document.querySelector("#schoolYear");
  school_year.innerHTML += `${row[0].school_year}`;

  const semester = document.querySelector("#semester");
  semester.innerHTML += `${row[0].semester}`;

  const dateGenerated = document.querySelector("#dateGenerated");
  dateGenerated.innerHTML += `${today.toDateString()}`;
};

getdata();
