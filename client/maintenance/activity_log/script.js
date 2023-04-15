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