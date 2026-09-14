const url = 'http://localhost:4321/api/admin/login';
const formData = new URLSearchParams();
formData.append('email', 'faisal.khan1192519@gmail.com');
formData.append('password', 'Apple@1d');

fetch(url, {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'http://localhost:4321'
  },
  redirect: 'manual'
}).then(res => {
  console.log('Status:', res.status);
  console.log('Headers:', res.headers);
  return res.text();
}).then(text => {
  console.log('Body:', text);
}).catch(console.error);
