const tbody = document.querySelector("#tbData");
const categoryList = document.querySelector("#categorySelect")

const getCategory = async () => {
  const endpoint = "http://localhost:3000/api/category",
    response = await fetch(endpoint),
    data = await response.json(),
    category = data.data;

  category.forEach((row) => {
    categoryList.innerHTML += `<option value="${row.id}">${row.name}</option>`;
  });
};

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/item",
    response = await fetch(endpoint),
    data = await response.json(),
    departments = data.data;

  departments.forEach((row) => {
    tbody.innerHTML += `<tr id="${row.id}">
    <td class="text-center">${row.number}</td>
        <td ">${row.category}</td>
        
        <td >${row.question}</td>
        <td class="text-center">${row.is_active ? "Yes" : "No"}</td>
        <td>

        <div class="dropdown">
        <button class='btn bi bi-three-dots-vertical' id="${row.id}" data-bs-toggle="dropdown" )'></button>
  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#">Edit</a></li>
    <li><a class="dropdown-item" data-bs-toggle="modal" data-bs-target="#exampleModal" >Delete</a></li>
  </ul>
</div>
          
          </td> 
          </tr>`;
  });
};
getdata();
getCategory();



function submitForm(id) {
console.log(id)
}

function myFunction() {
  // Declare variables
  var input, filter, table, tr, td, i, txtValue;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  table = document.getElementById("myTable");
  tr = table.getElementsByTagName("tr");

  // Loop through all table rows, and hide those who don't match the search query
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[2];
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
