
import '~/lib/instrumentation.js'
import { ActivityType } from 'discord.js'
import { client } from 'robo.js'


export default () => {
	client.user?.setActivity({
		name: 'DES DC!!! ON ROCK!',
		type: ActivityType.Custom
	})
}
