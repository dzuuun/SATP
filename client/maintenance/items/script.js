const tbody = document.querySelector("#tbData");

const getdata = async () => {
  const endpoint = "http://localhost:3000/api/item",
    response = await fetch(endpoint),
    data = await response.json(),
    departments = data.data;

  departments.forEach((row) => {
    tbody.innerHTML += `<tr id="${row.id}">
        <td>${row.category}</td>
        <td>${row.number}</td>
        <td class="text-wrap">${row.question}</td>
        <td>${row.is_active ? "Yes" : "No"}</td>
        <td><button class='bi bi-pencil' data-bs-toggle="modal" id="${row.id}" data-bs-target="#exampleModal" )'></button>
          <button class='bi bi-trash3' onclick="submitForm(${row.id})")'></button></td>    </tr>`;
  });
};
getdata();

function submitForm(id) {
console.log(id)
}
