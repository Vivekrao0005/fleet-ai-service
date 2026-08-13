// Phase 1 prototype — not used in production
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function askFleetAI(userMessage) {
    const response = await client.responses.create({
        model: "gpt-5-mini",
        instructions: `
You are a fleet management AI assistant for a car rental company.

Your job is to help analyze vehicle fleet questions.

For now, you only answer based on the information provided
in the user's message.

Do not invent vehicle data.
Do not claim to have accessed the fleet database.
Be concise and professional.
        `,
        input: userMessage
    });

    return response.output_text;
}

module.exports = {
    askFleetAI
};
