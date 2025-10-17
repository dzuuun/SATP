const table = document.querySelector("#table");
const commentSection = document.querySelector("#commentSection");
const school_year = document.querySelector("#schoolYear");
const semester = document.querySelector("#semester");
const studentRater = document.querySelector("#studentRater");
const teacherRatee = document.querySelector("#teacherRatee");
const subjectCode = document.querySelector("#subjectCode");
const baseURL = "http://localhost:4000";
var userLoggedIn;
let transactionToRate;
var transaction_id;
var item_id = [];

// const getdata = async () => {
//   fetch(`/api/item/active/rate`, {
//     method: "GET",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   })
//     .then((res) => res.json())
//     .then((response) => {
//       rows = response.data;

//       rows.forEach((data) => {
//         item_id.push(data.id);
//       });
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
  await fetch(`/api/gradschool/item/active/starrating/rate`, {
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
        for (let j = 0; j < Object.values(result)[i].length; j++) {
          item_id.push(Object.values(result)[i][j].id);
          table.innerHTML += `
            <tr id="${Object.values(result)[i][j].id}">
              <td class="text-center">${
                Object.values(result)[i][j].number
              }.</td>
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
  await fetch(`/api/gradschool/item/active/comment/rate`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((response) => {
      for (let i = 0; i < response.data.length; i++) {
        commentSection.innerHTML += `
                                <label class="form-label ">${response.data[i].number}. ${response.data[i].question}</label>
                                <textarea style="resize: none" class="form-control comment-box" id="${response.data[i].id}" rows="2" required></textarea>                      
`;
      }
    });
};

async function getTransactionInfo(id) {
  await fetch(`/api/transaction/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      school_year.innerHTML = response.data[0].school_year;
      studentRater.innerHTML = response.data[0].student_name;
      semester.innerHTML = response.data[0].semester;
      teacherRatee.innerHTML = response.data[0].teachers_name;
      subjectCode.innerHTML = response.data[0].subject_code;
      transaction_id = response.data[0].id;
    });
}

async function submitRating() {
  //   let comment = document.getElementById("comment").value;
  // console.log(comment)
  // if (comment === "") {
  //   var commentStatus = {
  //     transaction_id: transactionToRate,
  //     user_id: userLoggedIn,
  //   };
  // } else {
  //   var commentStatus = {
  //     comment: comment,
  //     transaction_id: transactionToRate,
  //     user_id: userLoggedIn,
  //   };
  // }

  if (confirm("Are you sure? This action cannot be undone.") == true) {
    loadSpinner();
    // for star rating based items
    for (let i = 0; i < stars.widgets.length; i++) {
      var rating = {
        transaction_id: transactionToRate,
        item_id: item_id[i],
        rate: stars.widgets[i].indexSelected + 1,
      };
      console.log(rating)
      await fetch(`/api/transaction/add/rating`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(rating),
      })
        .then((res) => res.json())
        .then((response) => {
          if (response.success == 0) {
            // setErrorMessage(response.message);
          } else {
            console.log(response.message);
          }
        });
    }

    // for comment based items
    let data = [];
    document.querySelectorAll(".comment-box").forEach((textarea) => {
      data.push({
        gradschool_item_id: textarea.id,
        transaction_id: transactionToRate,
        comment: textarea.value.trim(),
        user_id: userLoggedIn,
      });
    });

    for (let i = 0; i < data.length; i++) {
      await fetch(`/api/gradschool/item/add/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data[i]),
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

    var transactionStatus = {
      transaction_id: transactionToRate,
      user_id: userLoggedIn,
    };

    await fetch(`/api/transaction/submit/ ` + transactionToRate, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionStatus),
    })
      .then((res) => res.json())
      .then((response) => {
        if (response.success == 0) {
          setErrorMessage(response.message);
        } else {
          hideSpinner();
          $("#rateDoneModal").modal("show");
        }
      });
  }
}

function closeRating() {
  window.open("../../rating/index.html", "_self");
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

document.addEventListener("DOMContentLoaded", function () {
  loadSpinner();
  userLoggedIn = localStorage.getItem("user_id");
  transactionToRate = localStorage.getItem("transactionToRate");
  if (transactionToRate === null) {
    alert("No subject to rate. Redirecting...");
    window.open("../rating/index.html", "_self");
  }
  getdata();
  getTransactionInfo(transactionToRate);

  window.addEventListener("load", function () {
    hideSpinner();
  });
});

function loadSpinner() {
  document.getElementById("overlay").style.display = "flex";
}

function hideSpinner() {
  document.getElementById("overlay").style.display = "none";
}

// const noEmojiInput = document.getElementById("comment");

// noEmojiInput.addEventListener("input", function () {
//   // Filter out emojis using a regular expression
//   const regex =
//     /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;

//   // Remove any emoji characters from the input value
//   noEmojiInput.value = noEmojiInput.value.replace(regex, "");
// });
