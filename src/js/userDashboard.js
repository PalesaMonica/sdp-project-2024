document.addEventListener("DOMContentLoaded", () => {
  fetch("/get-username")
  .then((response) => {
    if (response.status === 401) {
      // Redirect to login page if user is not authorized
      window.location.href = "/login";
      throw new Error("Unauthorized access. Redirecting to login...");
    }
    return response.json();
  })
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

    const openBtn = document.querySelector('.open-btn');
    const closeBtn = document.querySelector('.close-btn');
    const sidenav = document.getElementById('sidenav');
    const body = document.body;
  
    openBtn.addEventListener('click', () => {
      sidenav.style.width = '250px'; // Open the sidenav
      body.classList.add('open-sidenav'); // Shift the content
    });
  
    closeBtn.addEventListener('click', () => {
      sidenav.style.width = '0'; // Close the sidenav
      body.classList.remove('open-sidenav'); // Reset the content margin
    });
});

// Function to open the slide-out menu
function openNav() {
  document.getElementById("sidenav").style.width = "250px";
  document.body.style.marginLeft = "250px";
}

// Function to close the slide-out menu
function closeNav() {
  document.getElementById("sidenav").style.width = "0";
  document.body.style.marginLeft = "0";
}

function navigate(page) {
  alert(`Navigating to ${page} page`);
}

function logout() {
  // Send a POST request to the /logout endpoint
  fetch('/logout', {
    method: 'POST',
    credentials: 'same-origin', // Include cookies in the request
    headers: {
      'Content-Type': 'application/json',
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.msg === "Logout successful") {
      // Redirect the user to the login page
      window.location.href = data.redirectUrl;
    } else {
      // Handle any errors or unsuccessful logout
      alert("Logout failed. Please try again.");
    }
  })
  .catch(error => {
    console.error("Error during logout:", error);
  });
}

module.exports = { navigate };
