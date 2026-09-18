<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { AlertCircle } from 'lucide-svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let code = $state(page.url.searchParams.get('code') ?? '');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isSubmitting) return;
		error = '';

		if (!code) {
			error = 'This reset link is invalid (missing code).';
			return;
		}
		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return;
		}
		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}

		isSubmitting = true;
		try {
			const res = await fetch('/api/auth/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code, password, confirm: confirmPassword })
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				error = data.message || 'Could not reset your password.';
				return;
			}
			toast.success('Password updated. Please sign in.');
			goto('/login');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="relative flex h-screen items-center justify-center px-4">
	<Button href="/login" variant="ghost" size="sm" class="absolute left-4 top-4">← Back to Login</Button>
	<Card class="w-[400px] max-w-full">
		<CardHeader>
			<CardTitle>Reset password</CardTitle>
			<CardDescription>Choose a new password for your Darkian Mail account.</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="grid gap-4">
				{#if error}
					<Alert variant="destructive">
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				{/if}

				<div class="grid gap-2">
					<Label for="password">New password</Label>
					<Input
						id="password"
						type="password"
						bind:value={password}
						required
						disabled={isSubmitting}
						autocomplete="new-password"
					/>
				</div>
				<div class="grid gap-2">
					<Label for="confirmPassword">Confirm new password</Label>
					<Input
						id="confirmPassword"
						type="password"
						bind:value={confirmPassword}
						required
						disabled={isSubmitting}
						autocomplete="new-password"
					/>
				</div>
				<Button type="submit" class="w-full" disabled={isSubmitting}>
					{isSubmitting ? 'Resetting...' : 'Reset password'}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>