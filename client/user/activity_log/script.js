const baseURL = "http://localhost:3000";

let data = $("#table").DataTable({
  ajax: {
    type: "GET",
    url: `${baseURL}/api/activitylog`,
  },
  responsive: true,
  ordering: false,
  order: [[0, "desc"]],
  columns: [{ data: "date_time" }, { data: "name" }, { data: "action" }],
});

function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
  nav = true;
}

var nav = false;

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
  nav = false;
}
function toggleNav() {
  nav ? closeNav() : openNav();
}

let signOutButton = document.getElementById("signout");

signOutButton.addEventListener("click", () => {
  // sessionStorage.clear();
  window.location.href = "../../index.html";
});

