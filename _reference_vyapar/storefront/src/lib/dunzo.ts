// src/lib/dunzo.ts

// Since we are mocking this API for now, we simulate a latency and return a success response
// with mock tracking details.

export async function createDunzoTask(payload: any) {
  console.log('[Dunzo Sandbox] Creating delivery task:', payload);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In production, this would make a POST request to https://api.dunzo.in/api/v1/tasks
  // using DUNZO_CLIENT_ID and DUNZO_CLIENT_SECRET

  // Return a mock success response
  return {
    success: true,
    task_id: `DNZ-${Math.floor(Math.random() * 1000000)}`,
    status: 'created',
    estimated_price: 65.50,
    tracking_url: `https://track.dunzo.com/mock-tracking/${Math.floor(Math.random() * 1000000)}`
  };
}
