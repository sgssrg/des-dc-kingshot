import type { Message } from 'discord.js'
import { Ollama } from '@langchain/ollama'
import { client } from 'robo.js'
const catLLM = new Ollama({
	model: 'DESTrial',
	baseUrl: 'http://localhost:11434',

	temperature: 0.8,
	maxRetries: 4
})

export default async (message: Message) => {
	if (message.author.bot) return
	if (client.user && message.mentions.has(client.user)) {
		message.reply('Hello! I am an DES DC Bot. How can I assist you today?')
	}
	if (message.channel.id === process.env.CHAT_WITH_AI_CHANNEL_ID) {
		try {
			let LLMResp = await catLLM.invoke(message.content)
			return message.reply(LLMResp)
		} catch (err) {
			console.error('Error calling Ollama API:', err)
			message.reply('Sorry, I am having trouble processing your request right now.')
		}
	}
}
