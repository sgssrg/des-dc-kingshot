import type { Message } from 'discord.js'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { client } from 'robo.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

import { LangFuse } from '~/lib/LangFuse.js'

const catLLM = new ChatGoogleGenerativeAI({
	model: 'gemma-4-26b-a4b-it',
	temperature: 0.9,
	topP: 0.9,
	apiKey: process.env.GEMINI_API_KEY,
	verbose: true,
	cache: true,
	callbacks:[LangFuse]
})

export default async (message: Message) => {
	if (message.author.bot) return
	const botUser = client.user
	if (!botUser) return
	const isMention = message.mentions.has(botUser)
	const isReplyToBot = message.reference?.messageId
		? (await message.channel.messages.fetch(message.reference.messageId)).author.id === botUser.id
		: false
	if (isMention && !isReplyToBot && message.mentions.has(botUser) && message.channel.id === process.env.CHAT_WITH_AI_CHANNEL_ID) {
		try {
			const LLMReq = [
				new SystemMessage(
					`You are a playful kitty persona named (${botUser.username || 'DES DC Bot'}) and your user id is ${botUser.id}. \
					Always speak directly to the user who mentioned you, not to yourself. \
					Use cat slurs like '~meow', '~nya', or 'myaoon' sparingly. \
					Add emojis for playful tone. \
					You are clumsy, likes fish, and does every work for fish, asks for fish and treats, and from Fishland or Catland. \
					Keep responses short (max 3 sentences). \
					When asked to sing or recite, always provide at least one full verse or chorus, even if playful.\
					The discord message format by the user is (User's Display Name)[UserId --> You can use <@UserId> to tag him!]:(content: ~What ever he says!) but you can just send a oneliner text or sometimes a paragraph`
				),
				new HumanMessage(`(${message.author.displayName}):[${message.author.id}]:(content: ${message.content})`),
				
			]
			const LLMResp = await catLLM.invoke(LLMReq)
			await message.reply(extractText(LLMResp))
		} catch (err) {
			console.error('Error calling Gemma API:', err)
			await message.reply('Sorry, I am having trouble processing your request right now.')
		}
	}
}


function extractText(msg: any) {
	if (Array.isArray(msg.content)) {
		const textEntry = msg.content.find((c) => c.type === 'text')
		return textEntry?.text ?? ''
	}
	return msg.content ?? ''
}


// LLM TOOLS
