import type { Message } from 'discord.js'
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getLogger } from '~/lib/pino.log.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
const logger = getLogger(import.meta)
import { LangFuse } from '~/lib/LangFuse.js'

const translateLLM = new ChatGoogleGenerativeAI({
	model: 'gemma-4-31b-it',
	apiKey: process.env.GEMINI_API_KEY,
	verbose: true,
	cache:true,
	callbacks:[LangFuse]
})

export default async (message: Message) => {
	if (message.author.bot) return
	if (!message.content.startsWith('!dt')) return
	if ((message.client as any).lastHandledId === message.id) return
	;(message.client as any).lastHandledId = message.id
	logger.trace('!dt was triggered')
	const tMessage = await fetchReferencedMessage(message)
	if (!tMessage?.content) return
	const detectMessage = [
		new SystemMessage(
			'You are a language detection and translation assistant. Identify the language of the text, return ISO 639-1 code; Output the message in the format "Detected Language: [Language Name](Language Code)"'
		),
		new HumanMessage(tMessage.content)
	]
	const response = await translateLLM.invoke(detectMessage)
	logger.trace(response)
	await tMessage.reply(extractText(response))
}

const fetchReferencedMessage = async (message: Message) => {
	try {
		if (message?.reference?.messageId) {
			const refMessage: Message = await message.channel.messages.fetch(message.reference.messageId)
			if (refMessage?.content) {
				const safeContent = refMessage.content?.toString() ?? '<no content>'
				logger.trace(`Referenced message content: ${JSON.stringify(safeContent)}`)
			} else {
				logger.warn('Referenced message has no text content')
			}
			return refMessage
		}
	} catch (error) {
		logger.error('Error' + JSON.stringify(error))
	}
}
function extractText(msg:any) {
  if (Array.isArray(msg.content)) {
    const textEntry = msg.content.find(c => c.type === "text")
    return textEntry?.text ?? ""
  }
  return msg.content ?? ""
}