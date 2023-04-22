const tbody = document.querySelector('#tbData');

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/activitylog",
        response = await fetch(endpoint),
        data = await response.json(),
        departments = data.data;

 departments.forEach(data => {
    tbody.innerHTML += `<tr>
        <td>${data.date_time}</td>
        <td>${data.name}</td>
        <td class="text-wrap">${data.action}</td>
    </tr>`;
 });

}
getdata();

// /* Set the width of the side navigation to 250px */
// function openNav() {
//   document.getElementById("mySidenav").style.width = "250px";
// }

// /* Set the width of the side navigation to 0 */
// function closeNav() {
//   document.getElementById("mySidenav").style.width = "0";
// }

/* Set the width of the side navigation to 250px and the left margin of the page content to 250px */
function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
  document.getElementById("main").style.marginLeft = "250px";
   nav = true;
}

var nav = false;
/* Set the width of the side navigation to 0 and the left margin of the page content to 0 */
function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
  document.getElementById("main").style.marginLeft = "0";
   nav = false;
}
function toggleNav() {
  nav ? closeNav() : openNav();
}