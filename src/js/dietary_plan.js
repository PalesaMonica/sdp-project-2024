function handleBoxClick(option) {
    // Show the confirmation modal
    showConfirmationModal(option);
}

function showConfirmationModal(dietPlan) {
    // Set the diet plan in the modal
    document.getElementById('dietPlan').textContent = dietPlan;
    
    // Display the modal
    const modal = document.getElementById('confirmation-modal');
    modal.style.display = 'block';

    // Set up the confirm button click handler
    document.getElementById('confirm-button').onclick = function() {
        confirmSelection(dietPlan);
        modal.style.display = 'none';
    };

    // Set up the cancel button click handler
    document.getElementById('cancel-button').onclick = function() {
        modal.style.display = 'none'; // Close the modal if user cancels
    };
}

function confirmSelection(dietPlan) {
    fetch('/saveDietPreference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietPlan })
    })
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
    .then(data => {
        // Show the toaster with the confirmation message
        showToaster(`Your ${dietPlan} diet plan has been confirmed!`);

        // Reload the page after showing the toaster for 3 seconds
        setTimeout(() => {
            window.location.reload();  // Reload the page
        }, 1500); // Show the toaster for 3 seconds
    })
    .catch(error => console.error('Error:', error));
}

function showToaster(message) {
    const toaster = document.getElementById('toaster');
    toaster.textContent = message;
    toaster.classList.add('show');

    // Automatically hide the toaster after 3 seconds
    setTimeout(() => {
        toaster.classList.remove('show');
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-username')
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
      .then(data => {
        if (data.username) {
          document.getElementById('hello').textContent = `${data.username}!`;
        } else {
          console.error("Failed to load username.");
        }
      })
      .catch(error => console.error('Error fetching username:', error));

    // Fetch and display the current dietary plan
    fetch('/get-dietary_preference')
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
    .then(data => {
        if (data.preference) {
            document.getElementById('current-diet-plan').textContent = data.preference;
        } else {
            document.getElementById('current-diet-plan').textContent = 'No plan selected';
        }
    })
    .catch(error => console.error('Error fetching dietary preference:', error));
});
