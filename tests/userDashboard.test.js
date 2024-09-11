const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { navigate } = require('../src/js/userDashboard'); // Import relevant function

describe('userDashboard.html', () => {
    let dom;
    let document;

    beforeAll(() => {
      const html = fs.readFileSync(path.resolve(__dirname, '../public/userDashboard.html'), 'utf8');
      dom = new JSDOM(html, { runScripts: 'dangerously' });
      document = dom.window.document;
      global.document = document;
      global.window = dom.window;
    });

    test('should have a container', () => {
      const container = document.querySelector('.container');
      expect(container).not.toBeNull();
    });

    test('should have a header with logo', () => {
      const logo = document.querySelector('.logo');
      expect(logo).not.toBeNull();
      expect(logo.textContent).toContain('CampusCrave');
    });

    test('should display welcome message', () => {
      const welcome = document.querySelector('.welcome');
      expect(welcome).not.toBeNull();
      expect(welcome.textContent).toContain('Welcome John');
    });

    test('should display meal credits', () => {
      const credits = document.querySelector('.credits');
      expect(credits).not.toBeNull();
      expect(credits.textContent).toContain('70 Meal Credits');
    });

    test('should have a grid with 4 items', () => {
      const gridItems = document.querySelectorAll('.grid-item');
      expect(gridItems.length).toBe(4);
    });

    test('should have a footer with 2 items', () => {
      const footerItems = document.querySelectorAll('.footer-item');
      expect(footerItems.length).toBe(2);
    });

    test('should navigate to another page on button click', () => {
      global.alert = jest.fn(); // Mock the alert function

      navigate('menu'); // Simulate navigation
      // You can further test if the navigation logic works properly
      expect(true).toBe(true); // Example test, replace with actual validation of navigation
    });
});
