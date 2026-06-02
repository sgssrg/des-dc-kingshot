import type { Message } from 'discord.js'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { getLogger } from '~/lib/pino.log.js'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import * as z from 'zod'
import { client } from 'robo.js'
import { LangFuse } from '~/lib/LangFuse.js'
const logger = getLogger(import.meta)

const fetchReferencedMessageTool = tool(
	async ({ message }: { message: Message }) => {
		try {
			return await fetchReferencedMessage(message)
		} catch (error) {
			console.error('Error fetching referenced message:', error)
			return 'Error fetching referenced message.'
		}
	},
	{
		name: 'fetch_referenced_message',
		description: 'Fetch the content of a referenced Discord message for translation.',
		schema: z.object({
			message: z.any().describe('the message object given by discord')
		})
	}
)

const tools = [fetchReferencedMessageTool]
const translateLLM = new ChatGoogleGenerativeAI({
	model: 'gemma-4-31b-it',
	apiKey: process.env.GEMINI_API_KEY,
	verbose: true,
	cache: true,
	callbacks: [LangFuse]
})
const translateLLMWithTools = translateLLM.bindTools(tools)

export default async (message: Message) => {
	if (message.author.bot) return
	if (message.content.startsWith('!t')) {
		if ((message.client as any).lastHandledId === message.id) return
		;(message.client as any).lastHandledId = message.id
		logger.trace('!t was triggered')
		const tMessage = await fetchReferencedMessage(message)
		if (!tMessage?.content) return
		const prompt = message.content.split(' ')
		const detectMessage = [
			new SystemMessage(
				`You are a professional any language to ${prompt[1] || process.env.DEFAULT_BOT_LANGUAGE_TRANSLATE || 'English'} translator. Your goal is to accurately convey the meaning and nuances of the original language text while adhering to ${prompt[1] || process.env.DEFAULT_BOT_LANGUAGE_TRANSLATE || 'English'} grammar, vocabulary, and cultural sensitivities.
            Produce only the ${prompt[1] || process.env.DEFAULT_BOT_LANGUAGE_TRANSLATE || 'English'} translation, without any additional explanations or commentary. Please translate the following original text into ${prompt[1] || process.env.DEFAULT_BOT_LANGUAGE_TRANSLATE || 'English'}`
			),
			new HumanMessage(tMessage.content)
		]
		const response = await translateLLM.invoke(detectMessage)
		logger.trace(response)
		await tMessage.reply(`<@${message.mentions.repliedUser}>: ${extractText(response)}`)
	}
	const botUser = client.user
	if (!botUser) return
	const isMention = message.mentions.has(botUser)
	const isReplyToBot = message.reference?.messageId
		? (await message.channel.messages.fetch(message.reference.messageId)).author.id === botUser.id
		: false

	if (isMention && !isReplyToBot && message.mentions.has(botUser)) {
		const intentPrompt = [
			new SystemMessage(
				'You are an intent classifier. Decide if the user wants translation. output either true or false and nothing else'
			),
			new HumanMessage(message.content)
		]
		const intentResp = await translateLLM.invoke(intentPrompt)
		const intent = extractText(intentResp).toLowerCase()

		if (intent.includes('true')) {
			try {
				if ((message.client as any).lastHandledId === message.id) return
				;(message.client as any).lastHandledId = message.id
				logger.trace('!t was triggered')
				logger.trace(message)
				const tMessage = await fetchReferencedMessage(message)
				const detectMessage = [
					new SystemMessage(
						`You are a professional any language to what every user asks translator. Your goal is to accurately convey the meaning and nuances of the original language text while adhering to grammar, vocabulary, and cultural sensitivities of both languages.Produce only the user asked language translation, without any additional explanations or commentary. Please translate the following original text into the language user asks; if you want the original referenced message content, call the tool "fetch_referenced_message". Otherwise, translate directly.`
					),
					new HumanMessage(message.content)
				]
				const response = await translateLLMWithTools.invoke(detectMessage)
				logger.trace(response)
				await (tMessage ?? message).reply(`<@${message.mentions.repliedUser}>: ${extractText(response)}`)
			} catch (error) {
				logger.error(error)
				message.reply('Unable to translate and process!')
			}
		} else {
			return
		}
	}
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
function extractText(msg: any) {
	if (Array.isArray(msg.content)) {
		const textEntry = msg.content.find((c) => c.type === 'text')
		return textEntry?.text ?? ''
	}
	return msg.content ?? ''
}

/*
if (message.reference?.messageId) {
  const refContent = await fetchReferencedMessageTool.invoke({ message });
  const detectMessage = [
    new SystemMessage("Translate into English."),
    new HumanMessage(refContent),
  ];
  const response = await translateLLM.invoke(detectMessage);
  await message.reply(extractText(response));
}

*/
