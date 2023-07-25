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

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/item/active/rate",
    response = await fetch(endpoint),
    data = await response.json(),
    rows = data.data;

  rows.forEach((data) => {
    item_id.push(data.id);
  });
  rows.forEach((data) => {
    table.innerHTML += `
      <tr id="${data.id}">
        <td class="text-center">${data.number}</td>
        <td class="text-wrap fs-6">${data.category}</td>
        <td class="text-wrap fs-6">${data.question}</td>
          <td>
            <div class="text-nowrap fs-4">
              <select class="star-rating" required>
                <option value="">Select a rating</option>
                <option value="5">Excellent</option>
                <option value="4">Very Good</option>
                <option value="3">Average</option>
                <option value="2">Poor</option>
                <option value="1">Terrible</option>
              </select>
            </div>
          </td>
        </tr>`;
  });

  // var result = rows.reduce((x, y) => {
  //   (x[y.category] = x[y.category] || []).push(y);
  //   return x;
  // }, {});
  stars.rebuild();
};

async function getTransactionInfo(id) {
  await fetch(`${baseURL}/api/transaction/` + id, {
    method: "GET",
  })
    .then((res) => res.json())
    .then((response) => {
      // console.log(response.data[0]);
      school_year.innerHTML = response.data[0].school_year;
      studentRater.innerHTML = response.data[0].student_name;
      semester.innerHTML = response.data[0].semester;
      teacherRatee.innerHTML = response.data[0].teachers_name;
      subjectCode.innerHTML = response.data[0].subject_code;
      transaction_id = response.data[0].id;
      // console.log(transaction_id);
    });
}

var stars = new StarRating(".star-rating");
var rate = [];

function submitRating() {
  let comment = document.getElementById("comment").value;
  var commentStatus = {
    comment: comment,
    transaction_id: transactionToRate,
    user_id: 1,
  };
  rate = [];

  if (confirm("Are you sure? This action cannot be undone.") == true) {
    for (let i = 0; i < item_id.length; i++) {
      var rating = {
        transaction_id: transactionToRate,
        item_id: item_id[i],
        rate: stars.widgets[i].indexSelected + 1,
      };
      console.log(rating);

      // fetch(`${baseURL}/api/transaction/add/rating`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(rating),
      // })
      //   .then((res) => res.json())
      //   .then((response) => {
      //     if (response.success == 0) {
      //     } else {
      //       console.log(response.message);
      //     }
      //   });
    }

    // fetch(`${baseURL}/api/transaction/submit/ ` + transactionToRate, {
    //   method: "PUT",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(commentStatus),
    // })
    //   .then((res) => res.json())
    //   .then((response) => {
    //     if (response.success == 0) {
    //       setErrorMessage(response.message);
    //     } else {
    //       $("#rateDoneModal").modal("show");
    //     }
    //   });
  }
}

function closeRating() {
  window.open("../rating/index.html", "_self"); // prompt modal first that the rating has been successfully submitted then open the previous window
}

$(document).ready(function () {
  transactionToRate = localStorage.getItem("transactionToRate");
  getdata();
  getTransactionInfo(transactionToRate);
});
