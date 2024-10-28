function showStaffLogin() {
  document.querySelectorAll('.login-type-button').forEach((btn, index) => {
      if (index === 0) {
          btn.classList.add('active');
      } else {
          btn.classList.remove('active');
      }
  });

  document.querySelectorAll('.input-wrapper').forEach(el => {
      el.style.display = 'block';
  });
  document.getElementById('staff-login-btn').style.display = 'block';
  document.getElementById('google-signin').style.display = 'none';
}

function showStudentLogin() {
  document.querySelectorAll('.login-type-button').forEach((btn, index) => {
      if (index === 1) {
          btn.classList.add('active');
      } else {
          btn.classList.remove('active');
      }
  });

  document.querySelectorAll('.input-wrapper').forEach(el => {
      el.style.display = 'none';
  });
  document.getElementById('staff-login-btn').style.display = 'none';
  document.getElementById('google-signin').style.display = 'flex';
}

async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  try {
      const response = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
          throw new Error(result.msg);
      }

      if (result.redirectUrl) {
          window.location.href = result.redirectUrl;
      }
  } catch (error) {
      const errorMessage = document.getElementById("error-message");
      errorMessage.textContent = error.message;
      errorMessage.style.display = 'block';
  }
}

document.getElementById('google-signin').addEventListener('click', () => {
  window.location.href = '/auth/google';
});
  
module.exports = { handleLogin };
  