// src/lib/shadowfax.ts

// Since we are mocking this API for now, we simulate a latency and return a success response
// with mock tracking details.

export async function createShadowfaxTask(payload: any) {
  console.log('[Shadowfax Sandbox] Creating delivery task:', payload);

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In production, this would make a POST request to https://api.shadowfax.in/api/v3/orders
  // using SHADOWFAX_API_TOKEN

  // Return a mock success response
  return {
    success: true,
    task_id: `SFX-${Math.floor(Math.random() * 1000000)}`,
    status: 'assigned',
    estimated_price: 55.00,
    tracking_url: `https://track.shadowfax.in/mock-tracking/${Math.floor(Math.random() * 1000000)}`
  };
}
