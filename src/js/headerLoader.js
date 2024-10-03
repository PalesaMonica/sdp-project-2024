document.addEventListener("DOMContentLoaded", () => {
    // Fetch and insert the header into the page
    fetch('/header.html') // Provide the correct path to your header.html
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data); // Inserts the header at the top of the body

            // Initialize any functions related to the header (e.g., cart count)
            fetchCartItemCount();

            // Once everything is loaded, make the body visible
            document.body.classList.add('loaded');
        })
        .catch(error => console.error('Error loading header:', error));

        fetchCartItemCount(); 
    
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
  
  function toggleNav() {
    const sidenav = document.getElementById("sidenav");
    const container = document.querySelector(".container");
    if (sidenav.style.width === "250px") {
        sidenav.style.width = "0";
        document.body.style.marginLeft = "0";
        container.style.marginLeft = "auto";
    } else {
        sidenav.style.width = "250px";
        document.body.style.marginLeft = "250px";
        container.style.marginLeft = "auto";
    }
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
  
  function fetchCartItemCount() {
    fetch('/api/cart-count')  // Assuming you have an API to get the cart item count
    .then((response) => {
        if (response.status === 401) {
          // Redirect to login page if user is not authorized
          window.location.href = "/login";
          throw new Error("Unauthorized access. Redirecting to login...");
        }
        return response.json();
      })
    .then(data => {
        updateCartIcon(data.cartCount);  // Update the cart icon with the number of items
    })
    .catch(error => console.error('Error fetching cart count:', error));
  }
  
  // Function to update the cart icon with the cart item count
  function updateCartIcon(cartItemCount) {
    const cartIcon = document.getElementById('cart-count');
    cartIcon.textContent = cartItemCount;
  }