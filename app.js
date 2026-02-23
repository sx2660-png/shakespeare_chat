const chatArea = document.getElementById('chatArea');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const apiKeyInput = document.getElementById('apiKey');
const characterSelect = document.getElementById('characterSelect');
const introName = document.getElementById('introName');
const introText = document.getElementById('introText');
const loadingIndicator = document.getElementById('loadingIndicator');

let chatHistory = [];

const characterIntros = {
    "Hamlet": "To be, or not to be: that is the question... What brings thee to my melancholy presence? The heavy burden of revenge weights upon my soul.",
    "Macbeth": "So foul and fair a day I have not seen. Who goes there? The blood upon my hands will ne'er wash clean...",
    "Romeo": "O, speak again, bright angel! For thou art as glorious to this night... though the stars themselves defy our love.",
    "Juliet": "O Romeo, Romeo! wherefore art thou Romeo? Speak to my heavy heart. The vault of death is now my bridal bed.",
    "King Lear": "Blow, winds, and crack your cheeks! rage! blow! I am a man more sinn'd against than sinning. Approach, if thou darest.",
    "Othello": "It is the cause, it is the cause, my soul. Speak, what wouldst thou with me? The green-eyed monster hath consumed my reason.",
    "Ophelia": "There's rosemary, that's for remembrance... pray, love, remember. The water is cold, and my heart is broken. Art thou a friend?",
    "Lady Macbeth": "Out, damned spot! out, I say!... What is done cannot be undone. Speak your purpose before the shadows consume me."
};

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = '24px';
    this.style.height = (this.scrollHeight) + 'px';
});

characterSelect.addEventListener('change', (e) => {
    const char = e.target.value;
    introName.textContent = char;
    introText.textContent = characterIntros[char];
    
    // Clear chat history visually
    const messages = chatArea.querySelectorAll('.message:not(:first-child)');
    messages.forEach(msg => msg.remove());
    chatHistory = [];
    chatArea.appendChild(loadingIndicator); // move loading to bottom
});

function addMessage(text, isUser = false, charName = "") {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user' : 'character'}`;
    
    if (!isUser && charName) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'character-name';
        nameDiv.textContent = charName;
        msgDiv.appendChild(nameDiv);
    }

    const textDiv = document.createElement('div');
    textDiv.innerHTML = text.replace(/\n/g, '<br>');
    msgDiv.appendChild(textDiv);

    chatArea.insertBefore(msgDiv, loadingIndicator);
    chatArea.scrollTop = chatArea.scrollHeight;
}

async function generateResponse(userText) {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Please enter a valid Gemini API Key in the settings bar above.");
        return;
    }

    const character = characterSelect.value;
    sendBtn.disabled = true;
    userInput.disabled = true;
    loadingIndicator.classList.add('active');

    // Strong prompt enforcing persona and tragic theme
    const systemPrompt = `You are ${character} from William Shakespeare's plays. The user is a mortal interacting with your tragic soul. 
    You MUST reply strictly in the persona, tone, vocabulary, and worldview of ${character}. 
    Reflect heavily on your tragic fate, your deepest regrets, inner conflicts, and sorrow. Do not break character under any circumstance. 
    Speak in Early Modern English (Shakespearean style), using words like "thou", "thee", "hath", "doth", etc., but keep it comprehensible to a modern reader. 
    Keep your response dramatic, poetic, and concise (2 to 4 sentences max).`;

    const contents = [
        {
            role: "user",
            parts: [{ text: systemPrompt }]
        },
        {
            role: "model",
            parts: [{ text: `I understand my fate. I shall speak as ${character}, bearing the heavy burden of my tragedy.` }]
        }
    ];

    // Append historical messages for context window
    for (let msg of chatHistory) {
        contents.push(msg);
    }

    // Add the new user prompt
    contents.push({
        role: "user",
        parts: [{ text: userText }]
    });

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.85,
                    maxOutputTokens: 300,
                }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `API Error HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
            const replyText = data.candidates[0].content.parts[0].text;

            // Add to internal history
            chatHistory.push({ role: "user", parts: [{ text: userText }] });
            chatHistory.push({ role: "model", parts: [{ text: replyText }] });

            addMessage(replyText, false, character);
        } else {
            throw new Error("Invalid response format from Gemini API");
        }

    } catch (error) {
        console.error(error);
        addMessage(`[Alas, a mystical interference hath occurred: ${error.message}]`, false, "System");
    } finally {
        sendBtn.disabled = false;
        userInput.disabled = false;
        loadingIndicator.classList.remove('active');
        userInput.focus();
    }
}

sendBtn.addEventListener('click', () => {
    const text = userInput.value.trim();
    if (text) {
        addMessage(text, true);
        userInput.value = '';
        userInput.style.height = '24px';
        generateResponse(text);
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});
