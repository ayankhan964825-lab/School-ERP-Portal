const testPrompt = { 
  contents: [{ parts: [{ text: 'Respond with JSON {"action": "hello"}' }] }],
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 }
};
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=AQ.Ab8RN6KZUpSFBuy1Nm75tFmw5nfmiwUFBlIwRyOM_rEEJw9fZA', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPrompt)
}).then(r => r.json()).then(data => { console.log('DATA:', JSON.stringify(data, null, 2)); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
