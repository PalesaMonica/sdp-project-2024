// Mock socket.io
global.io = jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
}));

const { fetchAdminNotifications } = require('../src/js/notification'); // Adjust the path as necessary

// Mock Date.now to control timestamps in tests
const mockDateNow = 1609459200000; // Jan 1, 2021 00:00:00 UTC
global.Date.now = jest.fn(() => mockDateNow);

// Mock userCreatedAt date // Date before the mockDateNow
describe('fetchAdminNotifications', () => {
    const userCreatedAt = new Date('2020-12-31T00:00:00Z'); // Use this in the test case

    beforeEach(() => {
        // Reset mocks before each test
        fetch.resetMocks();
    });

    it('should fetch and return filtered admin notifications', async () => {
        const mockNotifications = [
            {
                id: 1,
                created_at: '2021-01-01T10:00:00Z',
                title: 'Notification 1',
                message: 'Test message 1',
                is_read: 0,
                icon: '../images/info.png',
            },
            {
                id: 2,
                created_at: '2020-12-25T10:00:00Z',
                title: 'Notification 2',
                message: 'Test message 2',
                is_read: 1,
                icon: '../images/info.png',
            },
        ];

        // Mock successful fetch response
        fetch.mockResponseOnce(JSON.stringify(mockNotifications));

        const notifications = await fetchAdminNotifications(userCreatedAt);

        expect(fetch).toHaveBeenCalledWith('/notifications', { method: 'GET' });
        expect(notifications).toEqual([
            {
                id: 1,
                type: 'admin',
                title: 'Notification 1',
                content: 'Test message 1',
                unread: true,
                timestamp: '2021/01/01, 14:00:00', // Adjust for South African time (UTC+2)
                icon: '../images/info.png',
            },
        ]);
    });

    it('should redirect to login on 401 response', async () => {
        const originalWindowLocation = window.location; // Store the original window.location
        delete window.location; // Delete the existing window.location
        window.location = { href: '' }; // Replace with a mock object

        fetch.mockResponseOnce(null, { status: 401 }); // Mock the 401 response

        await fetchAdminNotifications(userCreatedAt); // Trigger the fetch

        expect(window.location.href).toBe('/login'); // Check if it redirected to '/login'

        window.location = originalWindowLocation; // Restore the original window.location after test
    });

    it('should return an empty array on fetch error', async () => {
        fetch.mockReject(new Error('Network Error'));

        const notifications = await fetchAdminNotifications(userCreatedAt);

        expect(notifications).toEqual([]);
    });
});
