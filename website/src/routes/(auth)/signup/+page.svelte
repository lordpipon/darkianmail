<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { AlertCircle } from 'lucide-svelte';
	import DomainInput from '$lib/components/self/DomainInput.svelte';
	import { debounce, validateUsername } from '$lib/utils';
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { page } from '$app/stores';

	let { form }: { form: ActionData } = $props();

	let initialUsername = $page.url.searchParams.get('username') || '';
	let username = $state(initialUsername);
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	let usernameError = $state('');
	let usernamePending = $state(false);
	let isUsernameValid = $state(false);

	const debouncedCheck = debounce(async (value: string) => {
		if (!value) {
			usernameError = '';
			isUsernameValid = false;
			return false;
		}

		if (!validateUsername(value)) {
			usernameError = 'Username contains invalid characters (or is over 20 characters)';
			isUsernameValid = false;
			return false;
		}

		usernamePending = true;
		const response = await fetch(`/api/username/check?username=${encodeURIComponent(value)}`);
		const data = await response.json();
		usernamePending = false;

		if (!data.available) {
			usernameError = data.error;
			isUsernameValid = false;
			return false;
		}

		usernameError = '';
		isUsernameValid = true;
		return true;
	}, 300);

	function validateForm() {
		if (!username || !password || !confirmPassword) return false;
		if (usernameError) return false;
		if (password !== confirmPassword) return false;
		if (password.length < 8) return false;
		return true;
	}

	function handleSubmit() {
		if (!validateForm()) return;
		isSubmitting = true;
	}

	$effect(() => {
		if (form) {
			isSubmitting = false;
			password = '';
			confirmPassword = '';
		}
	});

	$effect(() => {
		if (username) {
			debouncedCheck(username);
		} else {
			isUsernameValid = false;
			usernameError = '';
		}
	});
</script>

<div class="relative flex min-h-screen items-center justify-center p-4">
	<Button href="/" variant="ghost" size="sm" class="absolute left-4 top-4">← Back to Home</Button>
	<Card class="w-[95vw] max-w-[400px] min-w-[320px]">
		<CardContent
			class="scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 max-h-[85vh] overflow-y-auto overflow-x-hidden p-4 md:p-6"
		>
			<div class="w-full">
				<div class="mb-6 flex flex-col space-y-1.5">
					<div
						role="heading"
						aria-level={3}
						class="text-2xl font-semibold leading-none tracking-tight"
					>
						Create Account
					</div>
					<p class="text-muted-foreground text-sm">Enter your details to get started.</p>
				</div>

				<form
					method="POST"
					use:enhance={() => {
						handleSubmit();
						return async ({ result, update }) => {
							isSubmitting = false;
							await update();
						};
					}}
				>
					{#if form?.error}
						<Alert variant="destructive" class="mb-4">
							<AlertCircle class="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>{form.error}</AlertDescription>
						</Alert>
					{/if}

					<div class="grid gap-4">
						<div class="grid gap-2">
							<Label for="username">Username</Label>
							<DomainInput
								domain={PUBLIC_DOMAIN}
								id="username"
								name="username"
								bind:value={username}
								required
								disabled={isSubmitting}
							/>
							{#if usernamePending}
								<p class="text-muted-foreground text-xs">Checking availability...</p>
							{:else if usernameError}
								<p class="text-destructive text-xs">{usernameError}</p>
							{:else if isUsernameValid}
								<p class="text-xs text-green-600 dark:text-green-500">
									This will be your email address
								</p>
							{/if}
						</div>
						<div class="grid gap-2">
							<Label for="password">Password</Label>
							<Input
								id="password"
								name="password"
								type="password"
								bind:value={password}
								required
								minlength={8}
								disabled={isSubmitting}
							/>
							<p class="text-muted-foreground text-xs">Must be at least 8 characters long</p>
						</div>
						<div class="grid gap-2">
							<Label for="confirmPassword">Confirm Password</Label>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								bind:value={confirmPassword}
								required
								minlength={8}
								disabled={isSubmitting}
							/>
						</div>

						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{isSubmitting ? 'Creating Account...' : 'Create Account'}
						</Button>
						<div class="text-center text-xs">
							By signing up, you agree to our{' '}
							<a href="/legal/privacy" class="text-primary hover:underline">Privacy Policy</a>
							and{' '}
							<a href="/legal/terms" class="text-primary hover:underline">Terms of Service</a>.
						</div>
						<div class="mt-2 text-center text-sm">
							Already have an account?
							<a href="/login" class="text-primary hover:underline"> Log in </a>
						</div>
					</div>
				</form>
			</div>
		</CardContent>
	</Card>
</div>

<style>
	/* Custom scrollbar styling */
	:global(.scrollbar-thin) {
		scrollbar-width: thin;
	}

	:global(.scrollbar-thumb-primary\/10) {
		scrollbar-color: rgba(var(--primary) / 0.1) transparent;
	}

	:global(.hover\:scrollbar-thumb-primary\/20:hover) {
		scrollbar-color: rgba(var(--primary) / 0.2) transparent;
	}
</style>