/**
 * @jest-environment jsdom
 */

// Mock the transactions array
const mockTransactions = [
  { name: 'Monate Mpolaye Dining', date: '2024-08-09', amount: -55.00, type: 'Lunch' },
  { name: '4NMP Dining Hall', date: '2024-08-08', amount: 60.00, type: 'Cancellation' },
  { name: '4NMP Dining Hall', date: '2024-09-07', amount: -55.00, type: 'Lunch' },
  { name: 'Joyous Dining Hall', date: '2024-09-06', amount: -60.00, type: 'Breakfast' },
  { name: '4NMP Dining Hall', date: '2024-09-05', amount: -60.00, type: 'Supper' },
  { name: 'Monate Mpolaye Dining', date: '2024-09-04', amount: -55.00, type: 'Lunch' },
  { name: '4NMP Dining Hall', date: '2024-09-03', amount: 60.00, type: 'Cancellation' },
  { name: '4NMP Dining Hall', date: '2024-09-02', amount: -60.00, type: 'Supper' },
  { name: 'Joyous Dining Hall', date: '2024-09-01', amount: -55.00, type: 'Lunch' },
  { name: 'Monate Mpolaye Dining', date: '2024-08-20', amount: -55.00, type: 'Lunch' },
  { name: '4NMP Dining Hall', date: '2024-08-19', amount: 60.00, type: 'Cancellation' },
];

// Mock the transactions in the module
jest.mock('../src/js/transactionHistory', () => {
  const originalModule = jest.requireActual('../src/js/transactionHistory');
  return {
    ...originalModule,
    transactions: mockTransactions,
  };
});

const {formatDate, formatAmount, createTransactionHTML, filterTransactions, renderTransactions} = require('../src/js/transactionHistory');

describe('Transaction History Functions', () => {

  describe('formatDate', () => {
    test('formats date correctly', () => {
      expect(formatDate('2024-09-07')).toBe('Sep 7, 2024');
    });
  });

  describe('formatAmount', () => {
    test('formats positive amount correctly', () => {
      expect(formatAmount(60.00)).toBe('+R60.00');
    });

    test('formats negative amount correctly', () => {
      expect(formatAmount(-55.00)).toBe('-R55.00');
    });
  });

  describe('createTransactionHTML', () => {
    test('creates HTML for a transaction', () => {
      const transaction = {
        name: 'Test Dining Hall',
        date: '2024-09-07',
        amount: -55.00,
        type: 'Lunch'
      };
      const html = createTransactionHTML(transaction);
      expect(html).toContain('Test Dining Hall');
      expect(html).toContain('Lunch');
      expect(html).toContain('-R55.00');
    });
  });

  describe('filterTransactions', () => {
    test('filters transactions for the current day', () => {
      const result = filterTransactions('day');
      expect(Array.isArray(result)).toBe(true);
    });

    test('filters transactions for the current week', () => {
      const result = filterTransactions('week');
      expect(Array.isArray(result)).toBe(true);
    });

    test('filters transactions for the current month', () => {
      const result = filterTransactions('month');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('renderTransactions', () => {
    let originalDate;


    beforeAll(() => {
      // Save the original Date constructor
      originalDate = global.Date;
    
      // Mock the Date constructor to always return a fixed date
      const fixedDate = new Date('2024-09-07T00:00:00Z');
      global.Date = jest.fn(() => fixedDate);
      global.Date.now = jest.fn(() => fixedDate.getTime());
    });
    
    afterAll(() => {
      // Restore the original Date constructor after tests
      global.Date = originalDate;
    });

    test('renders transactions for a specific period', () => {
      const html = renderTransactions('day');
      console.log(html);
      expect(html).toContain('Sep 7, 2024'); // Make sure it renders the latest transaction
      expect(html).toContain('Lunch');
      expect(html).toContain('-R55.00');
    });

  });

  describe('Tab Switching', () => {
    beforeEach(() => {
      // Set up the DOM structure with tabs and the transactions list
      document.body.innerHTML = `
        <div id="transactions-list"></div>
        <div class="tab" data-period="day">Day</div>
        <div class="tab" data-period="week">Week</div>
        <div class="tab" data-period="month">Month</div>
      `;

      // Simulate the window.onload behavior
      window.onload();
    });

    test('displays transactions for the selected period when a tab is clicked', () => {
      // Mock the renderTransactions function to return actual HTML for the "week" period
      const mockRenderTransactions = jest
        .spyOn(require('../src/js/transactionHistory'), 'renderTransactions')
        .mockImplementation((period) => {
          if (period === 'week') {
            return `
              <div class="date-header">Sep 7, 2024</div>
              <div class="transaction">
                  <div class="transaction-details">
                      <strong>4NMP Dining Hall</strong>
                      <small>Lunch</small>
                  </div>
                  <div>
                      <span class="transaction-amount ">
                          -R55.00
                      </span>
                  </div>
              </div>
              <div class="date-header">Sep 6, 2024</div>
              <div class="transaction">
                  <div class="transaction-details">
                      <strong>Joyous Dining Hall</strong>
                      <small>Breakfast</small>
                  </div>
                  <div>
                      <span class="transaction-amount ">
                          -R60.00
                      </span>
                  </div>
              </div>
            `;
          }
          return '';
        });
    
      const tabs = document.querySelectorAll('.tab');
      const transactionsList = document.getElementById('transactions-list');
    
      // Simulate a click on the "Week" tab
      tabs[1].click();
    
      // Check that the transactions for the "week" period are rendered
      expect(transactionsList.innerHTML).toContain('<div class="date-header">Sep 7, 2024</div>');
      expect(transactionsList.innerHTML).toContain('<div class="date-header">Sep 6, 2024</div>');
      expect(transactionsList.innerHTML).toContain('Lunch');
      expect(transactionsList.innerHTML).toContain('Breakfast');
    
      expect(tabs[1].classList.contains('active')).toBe(true);
      expect(tabs[0].classList.contains('active')).toBe(false);
    
      // Restore original function
      jest.restoreAllMocks();
    });
  });
});
