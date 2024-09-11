const { JSDOM } = require('jsdom');
// Ensure correct path to signup.js for the handleSignup function
const { handleSignup } = require('../src/js/signup');

describe('signup.html', () => {
  let dom;
  let document;

  beforeAll(() => {
    const html = `
      <div class="signup">
        <form onsubmit="handleSignup(event)">
          <div class="input-wrapper">
            <input type="text" name="username" placeholder="Username" class="input-field" required />
          </div>
          <div class="input-wrapper">
            <input type="email" name="email" placeholder="Email" class="input-field" required />
          </div>
          <div class="input-wrapper">
            <input type="password" name="password" id="password" placeholder="Password" class="input-field" required />
          </div>
          <div class="input-wrapper">
            <input type="password" name="confirmPassword" id="confirmPassword" placeholder="Confirm Password" class="input-field" required />
          </div>
          <button type="submit" class="btn-create-account">Create account</button>
        </form>
        <p class="error-message" id="error-message"></p>
      </div>`;
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;

    // Mock FormData for Node.js
    global.FormData = class FormData {
      constructor() {
        this.data = {};
      }
      append(key, value) {
        this.data[key] = value;
      }
      entries() {
        return Object.entries(this.data);
      }
    };
  });

  test('should have a div with class "signup"', () => {
    const signupDiv = document.querySelector('div.signup');
    expect(signupDiv).not.toBeNull();
  });

  test('should have four input fields', () => {
    const inputWrappers = document.querySelectorAll('.input-wrapper');
    expect(inputWrappers.length).toBe(4);
  });

  test('should prevent default form submission on signup', () => {
    const event = {
      preventDefault: jest.fn(),
      target: document.querySelector('form'),
    };

    handleSignup(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('should display error message if passwords do not match', () => {
    document.getElementById('password').value = 'password123';
    document.getElementById('confirmPassword').value = 'password456';

    const event = {
      preventDefault: jest.fn(),
      target: document.querySelector('form'),
    };

    handleSignup(event);

    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Passwords do not match.');
  });

  test('should display error message on failed signup', async () => {
    document.getElementById('password').value = 'password123';
    document.getElementById('confirmPassword').value = 'password123';  // Ensure passwords match
  
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ msg: 'Signup failed' }),
      })
    );
    global.fetch = mockFetch;
  
    const event = {
      preventDefault: jest.fn(),
      target: document.querySelector('form'),
    };
  
    await handleSignup(event);
  
    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Signup failed');
  });
    
});
