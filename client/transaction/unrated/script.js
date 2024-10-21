const baseURL = "http://localhost:4000";
const tbody = document.getElementById("tbData");
var genSchoolYear = localStorage.getItem("transListSchoolYear");
var genSemester = localStorage.getItem("transListSemester");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const dateGenerated = document.querySelector("#dateGenerated");

var today = new Date();

async function getdata() {
  var query = {
    school_year_id: genSchoolYear,
    semester_id: genSemester,
  };
  await fetch(`${baseURL}/api/transaction/notrated`, {
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
        school_year.innerHTML += `${response.data[0].school_year}`;
        semester.innerHTML += `${response.data[0].semester}`;
        dateGenerated.innerHTML += `${today.toDateString()}`;
        var fragment = document.createDocumentFragment();
        // var rowData = "";
        // response.data.forEach((data) => {
        // console.log(response.data);
        // var row = document.createElement("tr");
        // row.innerHTML = `
        //           <td></td>
        //           <td class="text-capitalize">${data.username}</td>
        //           <td class="text-uppercase">${data.student_name}</td>
        //           <td class="text-uppercase">${data.year_level}</td>
        //           <td class="text-uppercase">${data.course}</td>
        //           <td class="text-uppercase">${data.department}</td>
        //           <td class="text-uppercase">${data.college}</td>
        //           <td class="text-uppercase">${data.subject_code}</td>
        //           <td class="text-uppercase">${data.teachers_name}</td>
        //       `;
        // fragment.appendChild(row);
        // console.log(row)
        // });
        // console.log(fragment);
        // tbody.innerHTML += rowData;
        // tbody.appendChild(fragment);

        const csv = Papa.unparse(response.data);
        console.log(csv);
// ...

// Create a Blob object
const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

// Create a download link
const link = document.createElement('a');
const url = URL.createObjectURL(blob);
link.href = url;
link.setAttribute('download', 'data.csv');

// Append the link to the document
document.body.appendChild(link);

// Trigger the click event to download the file
link.click();

// Remove the link from the document
document.body.removeChild(link);
      }
    });
}

getdata();

document.addEventListener("DOMContentLoaded", function () {
  // getdata();
  // csvExport('table')
});

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

  var filename = "Unrated Transactions " + today.toDateString() + ".csv";
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
