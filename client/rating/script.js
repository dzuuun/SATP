const baseURL = "http://localhost:3000";
var school_year_id = 5;
var semester_id = 1;
var student_id = 53;
var subject_id;
var s;
let table = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/transaction/student/subjects/school_year_id=${school_year_id}&semester_id=${semester_id}&student_id=${student_id}`,
    cache: true,
  },
  // ordering: false,
  columnDefs: [{ className: "dt-center", targets: "" }],
  columns: [
    { width: "2%", data: "subject_code" },
    { width: "15%", data: "teachers_name" },
    // {
    //   width: "5%",
    //   data: "null",
    //   render: function (data, type, row) {
    //     return `<td class="text-center fw-medium">${
    //       row.status ? "<span>Yes</span>" : '<span style="color: red">No</span>'
    //     }
    //             </td>`;
    //   },
    // },
    {
      width: "5%",
      data: "null",
      render: function (data, type, row) {
        return `<td class="text-center fw-medium">${
          row.status
            ? '<i class="bi fs-4 bi-check-circle-fill" style="color: darkgreen"></i>'
            : `<button type="button" class="btn text-white text-nowrap" style="background-color: darkgreen" title="Rate" onclick="rate(${row.id})">Rate</button>`
        }
                </td>`;
      },
    },
    // {
    //   width: "5%",
    //   data: null,
    //   render: function (data, type, row) {
    //     return `<td  class="text-center">
    //           <div class="text-nowrap">
    //             <button class='btn bi fs-5 bi-pencil' onclick="editFormCall(${row.id})")' title="Edit"></button>
    //           </div>
    //         </td> `;
    //   },
    // },
  ],
});

// function loadIncludedData() {
//     $.ajax({
//       url: `${baseURL}/api/transaction/all/school_year_id=${school_year_id}&semester_id=${semester_id}`,
//       type: "get",
//     })
//       .done(function (response) {
//         setSuccessMessage(response.message);
//         table.clear().draw();
//         table.rows.add(response.data).draw();
//       })
//       .fail(function (jqXHR, textStatus, errorThrown) {});
//   }

function setSuccessMessage(message) {
  document.getElementById(
    "toast-container"
  ).innerHTML = `<div id="toastContainer" class="toast bg-success text-white" role="alert" aria-live="assertive" aria-atomic="true">
  <div id="toast-header" class="toast-header border-0 bg-success text-white">
    <i class="bi bi-check-circle me-2"></i>
    <strong id="toastLabel" class="me-auto">Success</strong>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
  </div>
  <div class="d-flex">
    <div class="toast-body">
      ${message}
    </div>
  </div>
</div>`;
  $("#toastContainer").toast("show");
  setTimeout(() => {
    $(".alert").alert("close");
  }, 2000);
}

function setErrorMessage(message) {
  document.getElementById(
    "toast-container"
  ).innerHTML = `<div id="toastContainer" class="toast bg-danger text-white" role="alert" aria-live="assertive" aria-atomic="true">
  <div id="toast-header" class="toast-header border-0 bg-danger text-white">
    <i class="bi bi-check-circle me-2"></i>
    <strong id="toastLabel" class="me-auto">Error</strong>
    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
  </div>
  <div class="d-flex">
    <div class="toast-body">
      ${message}
    </div>
  </div>
</div>`;
  $("#toastContainer").toast("show");
  setTimeout(() => {
    $(".alert").alert("close");
  }, 2000);
}

async function rate(id) {
// console.log(id)
localStorage.setItem("transactionToRate", id);
//  transactionToRate = localStorage.getItem("transactionToRate");
// console.log(transactionToRate)
window.open("../rate/index.html", "_self")

// await fetch(`${baseURL}/api/transaction/` + id, {
//   method: "GET",
// })
//   .then((res) => res.json())
//   .then((response) => {
//     console.log(response)
//   });
}