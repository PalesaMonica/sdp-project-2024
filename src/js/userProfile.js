document.addEventListener('DOMContentLoaded', () => {
    // Fetch the user's username
    fetch('/get-username')
        .then(response => {
            if (response.status === 401) {
        // Redirect to login page if user is not authorized
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }
           else if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update the HTML element with the username
            document.getElementById('user-name').textContent = data.username; // For the main profile section
            document.getElementById('personal-name').textContent = data.username; // For the personal info section
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation for username:', error);
        });

    // Fetch the user's role
    fetch('/get-userrole')
        .then(response => {
            if (response.status === 401) {
        // Redirect to login page if user is not authorized
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }
            else if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update the HTML element with the user's role
            document.getElementById('personal-role').textContent = data.role; // Update the role
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation for role:', error);
        });

    // Fetch the user's email
    fetch('/get-useremail')
        .then(response => {
            if (response.status === 401) {
        // Redirect to login page if user is not authorized
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }
           else if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Update the HTML element with the email
            document.getElementById('personal-email').textContent = data.email; // Update the email
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation for email:', error);
        });
});
async function submitPassword() {
    const currentPassword = document.getElementById('currentPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    // Validate input fields
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("All fields are required.");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match.");
        return;
    }

    // Additional password strength checks can be added here

    try {
        const response = await fetch('/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                oldPassword: currentPassword,
                newPassword: newPassword,
                confirmPassword: confirmPassword,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.msg); // Display error message
            return;
        }

        alert("Password updated successfully.");
        showProfile(); // Go back to profile view
    } catch (error) {
        console.error('Error updating password:', error);
        alert("An unexpected error occurred.");
    }
}


function openNav() {
    document.getElementById("sidenav").style.width = "250px";
}

function closeNav() {
    document.getElementById("sidenav").style.width = "0";
}
async function fetchUserProfile() {
    try {
      const response = await fetch('/user-profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourToken}` // Include token if necessary
        }
      });
      if (response.status === 401) {
        // Redirect to login page if user is not authorized
        window.location.href = "/login";
        throw new Error("Unauthorized access. Redirecting to login...");
      }
     else  if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
  
      const data = await response.json();
      console.log('User Profile:', data);
      // Update the UI with user data as needed
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }
  
  // Call the function to fetch the user profile
  fetchUserProfile();
  

function showPersonalInfo() {
    document.getElementById("profile").classList.add("hidden");
    document.getElementById("personal-info").classList.remove("hidden");
}

function showUpdatePassword() {
    document.getElementById("profile").classList.add("hidden");
    document.getElementById("update-password").classList.remove("hidden");
}

function showProfile() {
    document.getElementById("personal-info").classList.add("hidden");
    document.getElementById("update-password").classList.add("hidden");
    document.getElementById("profile").classList.remove("hidden");
}
function logout() {
    fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',  // Ensures the session cookie is sent
    })
    .then(response => response.json())
    .then(data => {
      if (data.message === 'Logout successful') {
        window.location.href = data.redirectUrl;  // Redirect to login page
      } else {
        console.error('Logout failed:', data.message);
      }
    })
    .catch(err => {
      console.error('Error during logout:', err);
    });
  }



