async function testGroq() {
    console.log("Testing Groq...");
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(JSON.stringify(data.error));
        console.log("✅ Groq Working:", data.choices[0].message.content);
    } catch (e) {
        console.error("❌ Groq Failed:", e.message);
    }
}

async function testPollinations() {
    console.log("\nTesting Pollinations...");
    try {
        // Updated URL format from instagram-poster
        const res = await fetch(`https://gen.pollinations.ai/image/nature?model=flux&key=${process.env.POLLINATIONS_API_KEY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        console.log("✅ Pollinations Working (Received image bytes):", blob.size);
    } catch (e) {
        console.error("❌ Pollinations Failed:", e.message);
    }
}

async function testXAI() {
    console.log("\nTesting xAI (Grok)...");
    try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'grok-2-1212', // Updated to known working model
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(JSON.stringify(data.error));
        console.log("✅ xAI Working:", data.choices[0].message.content);
    } catch (e) {
        console.error("❌ xAI Failed:", e.message);
    }
}

async function testGemini() {
    console.log("\nTesting Gemini...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Say hello" }] }]
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(JSON.stringify(data.error));
        console.log("✅ Gemini Working:", data.candidates[0].content.parts[0].text);
    } catch (e) {
        console.error("❌ Gemini Failed:", e.message);
    }
}

(async () => {
    await testGroq();
    await testPollinations();
    await testXAI();
    await testGemini();
})();
