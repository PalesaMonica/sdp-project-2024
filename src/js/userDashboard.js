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
    
    const unreadCount = localStorage.getItem('unreadCount') || 0; // Default to 0 if not found
    document.getElementById("unread-count").textContent = unreadCount;
});

function navigate(page) {
  alert(`Navigating to ${page} page`);
}

module.exports = { navigate };
