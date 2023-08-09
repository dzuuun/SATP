
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
    sessionStorage.clear();
    window.location.href = "../index.html";
  });