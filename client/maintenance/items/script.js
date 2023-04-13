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
    </tr>`;
  });
};
getdata();
