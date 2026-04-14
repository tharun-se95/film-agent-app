
const projectId = '5b35d992-8917-40a0-b809-f85b07f99c98';
const prompt = 'Run Draft 2. Requirement: Full cinematic script, at least 1500 words. Log everything.';

async function run() {
  console.log('Triggering Agent...');
  const res = await fetch('http://localhost:3001/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, prompt })
  });
  
  const text = await res.text();
  console.log('Response:', text.substring(0, 100));
}

run();
