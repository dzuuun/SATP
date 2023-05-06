const table1 = document.querySelector("#table1");
const table2 = document.querySelector("#table2");
const table3 = document.querySelector("#table3");
const table4 = document.querySelector("#table4");
const table5 = document.querySelector("#table5");

// get items from API
const getActiveItems = async () => {
  const endpoint = "http://localhost:3000/api/item",
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  if (data.success == 0) {
    const banner = document.querySelector("#banner");
    banner.innerHTML = "<p>No record found.</p>";
  } else {
    // divide array by category
    var result = rows.reduce((x, y) => {
      (x[y.category] = x[y.category] || []).push(y);
      return x;
    }, {});

    initializeTable();

    // insert to tables by category
    result.TEACHER.forEach((row) => {
      table1.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td >${row.question}</td>
        <td class="text-center">${row.is_active ? '<span>Yes</span>' : '<span style="color: red">No</span>'}</td>
        <td>
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical' id="${
              row.id
            }" data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" onclick="editFormCall(${
                  row.id
                })" id="${row.id}" >Edit</a></li>
                <li><a class="dropdown-item" onclick="deleteData(${
                  row.id
                })" value="${
                  row.id
                }" >Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
    });

    result["TEACHING PROCEDURES"].forEach((row) => {
      table2.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td >${row.question}</td>
          <td class="text-center">${row.is_active ? '<span>Yes</span>' : '<span style="color: red">No</span>'}</td>
        <td>
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical' id="${
              row.id
            }" data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
              <li><a class="dropdown-item" onclick="editFormCall(${
                row.id
              })" id="${row.id}" >Edit</a></li>
              <li><a class="dropdown-item" onclick="deleteData(this)" value="${
                row.id
              }" >Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
    });

    result.STUDENTS.forEach((row) => {
      table3.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td >${row.question}</td>
          <td class="text-center">${row.is_active ? '<span>Yes</span>' : '<span style="color: red">No</span>'}</td>
        <td>
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical' id="${
              row.id
            }" data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
              <li><a class="dropdown-item" onclick="editFormCall(${
                row.id
              })" id="${row.id}" >Edit</a></li>
              <li><a class="dropdown-item" onclick="deleteData(this)" value="${
                row.id
              }" >Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
    });

    result.METHODOLOGY.forEach((row) => {
      table4.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td >${row.question}</td>
          <td class="text-center">${row.is_active ? '<span>Yes</span>' : '<span style="color: red">No</span>'}</td>
        <td>
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical' id="${
              row.id
            }" data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
              <li><a class="dropdown-item" onclick="editFormCall(${
                row.id
              })" id="${row.id}" >Edit</a></li>
                <li><a class="dropdown-item" onclick="deleteData(this)" value="${
                  row.id
                }" >Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
    });

    result["GENERAL OBSERVATION"].forEach((row) => {
      table5.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td >${row.question}</td>
          <td class="text-center">${row.is_active ? '<span>Yes</span>' : '<span style="color: red">No</span>'}</td>
        <td>
          <div class="dropdown">
            <button class='btn bi bi-three-dots-vertical' id="${
              row.id
            }" data-bs-toggle="dropdown" )'></button>
              <ul class="dropdown-menu">
              <li><a class="dropdown-item" onclick="editFormCall(${
                row.id
              })" id="${row.id}" >Edit</a></li>
              <li><a class="dropdown-item" onclick="deleteData(this)" value="${
                row.id
              }" >Delete</a></li>
              </ul>
          </div>
        </td> 
          </tr>`;
    });
  }
};

// Get category from API
const getCategory = async () => {
  const categoryList = document.querySelector("#categorySelect");
  const categoryList2 = document.querySelector("#categorySelectEdit");
  const endpoint = "http://localhost:3000/api/category",
    response = await fetch(endpoint),
    data = await response.json(),
    category = data.data;

  category.forEach((row) => {
    categoryList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
    categoryList2.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

// NEED UPDATE
// search table
function searchTable() {
  // Declare variables
  var input, filter, table, tr, td, i, txtValue;
  input = document.getElementById("search");
  filter = input.value.toUpperCase();
  table = document.getElementById("dataTable");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[1];
    if (td) {
      txtValue = td.textContent || td.innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
      } else {
        tr[i].style.display = "none";
      }
    }
  }
}

// post item to API
const formAddItem = document.querySelector("#newItemForm");
formAddItem.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(formAddItem);
  const isActive = document.getElementById("isQuestionActive").checked;
  if (isActive == false) {
    formData.append("is_active", "0");
  } else {
    formData.append("is_active", "1");
  }

  formData.append("user_id", "1"); // get user id from cookie (mock data)
  const data = Object.fromEntries(formData);

  fetch("http://localhost:3000/api/item/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((response) => {
      if (response.success == 0) {
        setErrorMessage(response.message);
      } else {
        setSuccessMessage(response.message);
        $("#addNewModal").modal("hide");
        initializeTable();
        getActiveItems();
      }
    });
});

// passing twice bug
// Delete data from API
// function deleteData(id) {
//   $("#deleteModal").modal("show");

//   $(document).on("click", "#deleteRow", function () {
//     const formData = new FormData();
//     formData.append("id", id);
//     formData.append("user_id", "1"); // get user id from cookie (mock data)
//     const data = Object.fromEntries(formData);

//     return fetch("http://localhost:3000/api/item/delete", {
//       method: "DELETE",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(data),
//     })
//       .then((res) => res.json())
//       .then((response) => {
//         if (response.success == 0) {
//           setErrorMessage(response.message);
//         } else {
//           setSuccessMessage(response.message);
//           $("#deleteModal").modal("hide");
//           initializeTable();
//           getActiveItems();
//         }
//       });
//   });
// }

// clear modal form upon closing
$(".modal").on("hidden.bs.modal", function () {
  $(this).find("form").trigger("reset");
});

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

function initializeTable() {
  table1.innerHTML = '<td colspan="5"> <strong>TEACHER</strong> </td>';
  table2.innerHTML =
    '<td colspan="5"> <strong>TEACHING PROCEDURES</strong> </td>';
  table3.innerHTML = '<td colspan="5"> <strong>STUDENTS</strong> </td>';
  table4.innerHTML = '<td colspan="5"> <strong>METHODOLOGY</strong> </td>';
  table5.innerHTML =
    '<td colspan="5"> <strong>GENERAL OBSERVATION</strong> </td>';
}

// passing twice bug
// update data on the API
// function editFormCall(id) {
//   fetch("http://localhost:3000/api/item/" + id, {
//     method: "GET",
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       data = response.data;
//       document.getElementById("itemNumberEditForm").value = data.number;
//       document.getElementById("categorySelectEdit").value = data.category_id;
//       document.getElementById("itemQuestionEdit").value = data.question;

//       if (data.is_active == 0) {
//         document.getElementById("isQuestionActiveEdit").checked = false;
//       } else {
//         document.getElementById("isQuestionActiveEdit").checked = true;
//       }
//       $("#editModal").modal("show");
//     });

//   const formEditItem = document.querySelector("#editItemForm");
//   formEditItem.addEventListener("submit", (event) => {
//     event.preventDefault();

//     const formData = new FormData(formEditItem);

//     const isActive = document.getElementById("isQuestionActiveEdit").checked;
//     if (isActive == false) {
//       formData.append("is_active", "0");
//     } else {
//       formData.append("is_active", "1");
//     }

//     formData.append("id", id);
//     formData.append("user_id", "1"); // get user id from localStorage (mock data)
//     const data = Object.fromEntries(formData);

//     fetch("http://localhost:3000/api/item/update", {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(data),
//     })
//       .then((res) => res.json())
//       .then((response) => {
//         if (response.success == 0) {
//           setErrorMessage(response.message);
//         } else {
//           setSuccessMessage(response.message);
//           $("#editModal").modal("hide");
//           initializeTable();
//           getActiveItems();
//         }
//       });
//   });
// }

// initialize datas on page load
getActiveItems();
getCategory();
