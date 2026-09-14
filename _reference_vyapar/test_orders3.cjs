const url = "https://xgfikdhcudyixwbwlcuh.supabase.co/rest/v1/orders?select=*&order=created_at.desc&limit=1";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZmlrZGhjdWR5aXh3YndsY3VoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI4MjE2NiwiZXhwIjoyMDk0ODU4MTY2fQ.296E1TlnGMs-tYClD6eq83HPHLkL9WBPsfw36HCKqgM";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": "Bearer " + key
  }
})
.then(res => res.json())
.then(data => {
  console.log(JSON.stringify(data, null, 2));
})
.catch(console.error);
