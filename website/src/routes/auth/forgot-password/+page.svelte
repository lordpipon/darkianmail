<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	let emailOrUsername = $state('');
	let isSubmitting = $state(false);
	let sent = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!emailOrUsername.trim() || isSubmitting) return;

		isSubmitting = true;
		try {
			const res = await fetch('/api/auth/forgot', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email_or_username: emailOrUsername })
			});
			if (res.ok) {
				sent = true;
			}
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="relative flex h-screen items-center justify-center px-4">
	<Button href="/login" variant="ghost" size="sm" class="absolute left-4 top-4">← Back to Login</Button>
	<Card class="w-[400px] max-w-full">
		<CardHeader>
			<CardTitle>Forgot password</CardTitle>
			<CardDescription>
				Enter your Darkian Mail username. If a recovery email is set on the account,
				we'll send a reset link there.
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if sent}
				<div class="text-md text-center text-muted-foreground">
					<p>
						If that account exists and has a recovery email, a password reset link is on its way.
					</p>
					<Button href="/login" variant="link" class="mt-2">Back to Login</Button>
				</div>
			{:else}
				<form onsubmit={handleSubmit} class="grid gap-4">
					<div class="grid gap-2">
						<Label for="email_or_username">Username or email</Label>
						<Input
							id="email_or_username"
							bind:value={emailOrUsername}
							placeholder="username or user@darkian.xyz"
							required
							disabled={isSubmitting}
							autocomplete="username"
						/>
					</div>
					<Button type="submit" class="w-full" disabled={isSubmitting || !emailOrUsername.trim()}>
						{isSubmitting ? 'Sending...' : 'Send reset link'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>