document.addEventListener("DOMContentLoaded", function () {
  var myModal = new bootstrap.Modal(document.getElementById("errorModal"));
  myModal.show();
});

var searchForm = document.getElementById("search-form");
var cardRows = document.querySelectorAll(".card-container .card");

searchForm.addEventListener("input", function () {
  var searchInput = searchForm.elements.search.value.toLowerCase().trim();
  for (var i = 0; i < cardRows.length; i++) {
    var fullUrl = cardRows[i]
      .querySelector(".full-link a")
      .textContent.toLowerCase()
      .replace(/\s+/g, " ");

    if (fullUrl.includes(searchInput)) {
      cardRows[i].style.display = "block";
    } else {
      cardRows[i].style.display = "none";
    }
  }
});




















const copyButtons = document.querySelectorAll(".copy-btn");

copyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const linkText = button.parentNode.querySelector(".short-link").textContent;

    // Create a temporary input element
    const tempInput = document.createElement("input");
    tempInput.value = linkText;
    document.body.appendChild(tempInput);

    // Select the text and execute the copy command
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices
    document.execCommand("copy");

    // Remove the temporary input element
    document.body.removeChild(tempInput);

    // Change the button's appearance temporarily
    button.innerHTML = '<i class="fas fa-check p-2"></i>';
    setTimeout(() => {
      button.innerHTML = '<i class="fas fa-copy p-2"></i>';
    }, 2000);
  });
});


var loadingInterface = document.getElementById('loading-interface');
    var loadStart = new Date().getTime();

    function displayLoadingInterface() {
      loadingInterface.style.display = 'flex';
    }

    function hideLoadingInterface() {
      loadingInterface.style.display = 'none';
    }

    window.addEventListener('load', function() {
      var loadTime = new Date().getTime() - loadStart;
      if (loadTime >= 5000) {
        displayLoadingInterface();
      } else {
        hideLoadingInterface();
      }
    });