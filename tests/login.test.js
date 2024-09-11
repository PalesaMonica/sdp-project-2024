// login.test.js
const { JSDOM } = require('jsdom');
const { handleLogin } = require('../src/js/login');

describe('login.html', () => {
  let dom;
  let document;

  beforeAll(() => {
    const html = `
      <div class="login">
        <form onsubmit="handleLogin(event)">
          <div class="input-wrapper">
            <input type="email" name="email" placeholder="Email" class="input-field" required />
          </div>
          <div class="input-wrapper">
            <input type="password" name="password" placeholder="Password" class="input-field" required />
          </div>
          <button type="submit" class="btn-sign-in">Sign In</button>
        </form>
        <p class="error-message" id="error-message"></p>
      </div>`;
    dom = new JSDOM(html, { runScripts: 'dangerously' });
    document = dom.window.document;
    global.document = document;
    global.window = dom.window;

    // Mock the FormData API for Node.js environment
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

  test('should have a div with class "login"', () => {
    const loginDiv = document.querySelector('div.login');
    expect(loginDiv).not.toBeNull();
  });

  test('should have two input fields', () => {
    const inputWrappers = document.querySelectorAll('.input-wrapper');
    expect(inputWrappers.length).toBe(2);
  });

  test('should prevent default form submission on login', () => {
    const event = {
      preventDefault: jest.fn(),
      target: document.querySelector('form'),
    };

    handleLogin(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('should display error message on failed login', async () => {
    const mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ msg: 'Login failed' }),
      })
    );
    global.fetch = mockFetch;

    const event = {
      preventDefault: jest.fn(),
      target: document.querySelector('form'),
    };

    await handleLogin(event);

    const errorMessage = document.getElementById('error-message');
    expect(errorMessage.textContent).toBe('Login failed');
  });

});
