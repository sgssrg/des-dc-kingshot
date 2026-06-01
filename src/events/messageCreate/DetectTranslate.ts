import type { Message } from 'discord.js'
import { Ollama } from '@langchain/ollama'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { getLogger } from '~/lib/pino.log.js'
const logger = getLogger(import.meta)
const translateLLM = new Ollama({
	model: 'translategemma:4b',
	maxRetries: 4,
	verbose: true
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
			'You are a language detection and translation assistant. Identify the language of the text, return ISO 639-1 code; Output the message in the format "Detected Language: [Language Name](Language Code)" '
		),
		new HumanMessage(tMessage.content)
	]
	const response = await translateLLM.invoke(detectMessage)
	logger.trace(response)
	await tMessage.reply(response)
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
