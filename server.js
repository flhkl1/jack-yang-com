const express = require('express');
const OpenAI = require('openai').OpenAI;
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// setup deepseek
const ai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
  });
  
  app.post('/command', async (req, res) => {
      const { command, password } = req.body;
  
      if (password !== process.env.PASSWORD) {
          return res.json({ type: 'chat', content: "ACCESS DENIED." });
      }
  
      try {
          const response = await ai.chat.completions.create({
              model: "deepseek-chat",
              messages: [
                  { role: "system", content: "You are the Architect. Respond in JSON format: {\"type\": \"chat\", \"content\": \"text\"}" },
                  { role: "user", content: command }
              ],
              response_format: { type: 'json_object' }
          });
          res.json(JSON.parse(response.choices[0].message.content));
      } catch (err) {
          res.status(500).json({ type: 'chat', content: "AI OFFLINE." });
      }
  });
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
      console.log(`==== SERVER INITIALIZED ====`);
      console.log(`Target: http://localhost:${PORT}`);
  });