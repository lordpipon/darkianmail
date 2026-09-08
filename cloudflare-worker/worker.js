export default {
	async email(message, env, ctx) {
		if (!env.INGEST_URL || !env.INGEST_TOKEN) {
			console.error('Missing INGEST_URL / INGEST_TOKEN binding');
			return;
		}

		try {
			const resp = await fetch(env.INGEST_URL, {
				method: 'POST',
				headers: {
					'content-type': 'message/rfc822',
					authorization: `Bearer ${env.INGEST_TOKEN}`,
					'x-envelope-from': message.from,
					'x-envelope-to': message.to
				},
				body: message.raw
			});

			if (!resp.ok) {
				console.error(`ingest failed: ${resp.status} ${await resp.text()}`);
			}
		} catch (err) {
			console.error(`worker error: ${err}`);
		}
	}
};