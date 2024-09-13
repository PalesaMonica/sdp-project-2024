document.addEventListener("DOMContentLoaded", () => {
  fetch("/get-username")
    .then((response) => response.json())
    .then((data) => {
      if (data.username) {
        document.getElementById("username").textContent = `${data.username}!`;
      } else {
        console.error("Failed to load username.");
      }
    })
    .catch((error) => console.error("Error fetching username:", error));
});

function navigate(page) {
  alert(`Navigating to ${page} page`);
}

module.exports = { navigate };
