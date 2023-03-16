function validate() {
    var username = document.getElementsByName("username")[0].value;
    var password = document.getElementsByName("password")[0].value;
    if (username == "admin" && password == "admin123") {
      alert("Login successful!");
    } else {
      alert("Invalid username or password. Please try again.");
    }
  }
  
  