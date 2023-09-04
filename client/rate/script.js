const table = document.querySelector("#table");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const studentRater = document.querySelector("#studentRater");
const teacherRatee = document.querySelector("#teacherRatee");
const subjectCode = document.querySelector("#subjectCode");
const baseURL = "http://localhost:3000";
let transactionToRate;
var transaction_id;
var item_id = [];

// const getdata = async () => {
//   fetch(`${baseURL}/api/item/active/rate`, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       console.log(response);
//       rows = response.data;

//       rows.forEach((data) => {
//         item_id.push(data.id);
//       });
//       console.log(item_id);
//       rows.forEach((data) => {
// table.innerHTML += `
//   <tr id="${data.id}">
//     <td class="text-center">${data.number}</td>
//     <td class="text-nowrap fs-6">${data.category}</td>
//     <td class="text-wrap fs-6">${data.question}</td>
//       <td>
//         <div class="text-nowrap fs-4">
//           <select class="star-rating" required>
//             <option value="0">Select a rating</option>
//             <option value="5">Excellent</option>
//             <option value="4">Very Good</option>
//             <option value="3">Average</option>
//             <option value="2">Poor</option>
//             <option value="1">Terrible</option>
//           </select>
//         </div>
//       </td>
//     </tr>`;
//       });
//       stars.rebuild();
//     });
// };

const getdata = async () => {
  fetch(`${baseURL}/api/item/active/rate`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((response) => {
      var result = response.data.reduce((x, y) => {
        (x[y.category] = x[y.category] || []).push(y);
        return x;
      }, {});

      for (let i = 0; i < Object.keys(result).length; i++) {
        table.innerHTML += `<th class="text-center" scope="row" colspan="4">${
          Object.values(result)[i][0].category
        }</th>`;

        for (let j = 0; j < Object.values(result)[i].length; j++) {
          item_id.push(Object.values(result)[i][j].id);
          table.innerHTML += `
            <tr id="${Object.values(result)[i][j].id}">
              <td class="text-center">${Object.values(result)[i][j].number}</td>
              <td class="text-wrap fs-6">${
                Object.values(result)[i][j].question
              }</td>
                <td>
                  <div class="text-nowrap fs-4">
                    <select class="star-rating" required>
                      <option value="0">Select a rating</option>
                      <option value="5">Excellent</option>
                      <option value="4">Very Good</option>
                      <option value="3">Average</option>
                      <option value="2">Poor</option>
                      <option value="1">Terrible</option>
                    </select>
                  </div>
                </td>
              </tr>`;
        }
        stars.rebuild();
      }
    });
};

async function getTransactionInfo(id) {
  await fetch(`${baseURL}/api/transaction/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      console.log(response);
      document.getElementById("teacherImage").src=`/${response.data[0].path}`;
      school_year.innerHTML = response.data[0].school_year;
      studentRater.innerHTML = response.data[0].student_name;
      semester.innerHTML = response.data[0].semester;
      teacherRatee.innerHTML = response.data[0].teachers_name;
      subjectCode.innerHTML = response.data[0].subject_code;
      transaction_id = response.data[0].id;
    });
}

function submitRating() {
  let comment = document.getElementById("comment").value;

  if (comment === "") {
    var commentStatus = {
      transaction_id: transactionToRate,
      user_id: 1,
    };
  } else {
    var commentStatus = {
      comment: comment,
      transaction_id: transactionToRate,
      user_id: 1,
    };
  }

  if (confirm("Are you sure? This action cannot be undone.") == true) {
    for (let i = 0; i < stars.widgets.length; i++) {
      var rating = {
        transaction_id: transactionToRate,
        item_id: item_id[i],
        rate: stars.widgets[i].indexSelected + 1,
      };
      fetch(`${baseURL}/api/transaction/add/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rating),
      })
        .then((res) => res.json())
        .then((response) => {
          if (response.success == 0) {
            setErrorMessage(response.message);
          } else {
            console.log(response.message);
          }
        });
    }

    fetch(`${baseURL}/api/transaction/submit/ ` + transactionToRate, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commentStatus),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          $("#rateDoneModal").modal("show");
        }
      });
  }
}

function closeRating() {
  window.open("../rating/index.html", "_self");
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

$(document).ready(function () {
  transactionToRate = localStorage.getItem("transactionToRate");
  getdata();
  getTransactionInfo(transactionToRate);
});
