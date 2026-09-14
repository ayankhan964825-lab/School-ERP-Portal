async function test() {
  try {
    // Note: We won't have the cookies, so it should return 403.
    // If it hangs, the server might be crashing or stuck.
    const res = await fetch('http://localhost:4321/api/admin/activity-logs');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
