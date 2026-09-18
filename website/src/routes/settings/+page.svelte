<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { TestTubeDiagonal } from 'lucide-svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { USER_DATA } from '$lib/stores/user';
	import { Progress } from '$lib/components/ui/progress';
	import { Download, Trash2, LogOut } from 'lucide-svelte';
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let notificationsEnabled = $state(false);
	let exportStatus = $state('none');
	let exportProgress = $state(0);
	let exportInterval: NodeJS.Timeout;
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordSubmitting = $state(false);

	let recoveryEmail = $state('');
	let recoveryLoading = $state(true);
	let recoverySaving = $state(false);
	let googleEnabled = $state(false);
	let googleLinked = $state(false);
	let googleEmail = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/settings/recovery');
			if (res.ok) {
				const data = await res.json();
				recoveryEmail = data.recovery_email ?? '';
				googleLinked = !!data.google_linked;
				googleEmail = data.google_email ?? '';
			}
		} catch (e) {
			// ignore
		} finally {
			recoveryLoading = false;
		}

		try {
			const gres = await fetch('/auth/google/status');
			if (gres.ok) {
				const gdata = await gres.json();
				googleEnabled = !!gdata.enabled;
			}
		} catch (e) {
			// ignore
		}
	});

	async function handleSaveRecovery() {
		const email = recoveryEmail.trim();
		if (!email) {
			toast.error('Enter a recovery email address.');
			return;
		}
		recoverySaving = true;
		try {
			const res = await fetch('/api/settings/recovery', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			if (!res.ok) {
				let message = 'Failed to save recovery email';
				try {
					const data = await res.json();
					if (data.message) message = data.message;
				} catch (e) {
					// ignore
				}
				toast.error(message);
				return;
			}
			toast.success('Recovery email saved');
		} catch (e) {
			toast.error('Failed to save recovery email');
		} finally {
			recoverySaving = false;
		}
	}

	async function handleUnlinkGoogle() {
		if (!confirm('Unlink this Google account? You can still sign in with your Darkian Mail password.')) return;
		try {
			const res = await fetch('/api/settings/google/unlink', { method: 'POST' });
			if (!res.ok) {
				toast.error('Failed to unlink Google account');
				return;
			}
			googleLinked = false;
			googleEmail = '';
			toast.success('Google account unlinked');
		} catch (e) {
			toast.error('Failed to unlink Google account');
		}
	}

	$effect(() => {
		if ($USER_DATA?.settings) {
			notificationsEnabled = $USER_DATA.settings.notifications_enabled;
		}
	});

	function sendTestNotification() {
		if (!notificationsEnabled) {
			toast.error('Notifications are not enabled.');
			return;
		}

		try {
			const notification = new Notification('Test Notification', {
				body: 'This is a test notification from Darkian Mail.',
				icon: '/favicon.svg',
				tag: Math.random().toString(36).substring(2, 15)
			});

			notification.onclick = () => window.focus();
		} catch (e) {
			toast.error('Could not show test notification.');
		}
	}

	async function handleToggleNotifications() {
		try {
			if (!notificationsEnabled) {
				const permission = await Notification.requestPermission();
				if (permission !== 'granted') {
					toast.error('Please allow notifications in your browser settings');
					return;
				}
			}

			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					notifications_enabled: !notificationsEnabled
				})
			});

			if (response.ok) {
				notificationsEnabled = !notificationsEnabled;
				if (notificationsEnabled) {
					toast.success('Notifications enabled');
					sendTestNotification();
				} else {
					toast.success('Notifications disabled');
				}
			}
		} catch (error) {
			toast.error('Failed to update notification settings');
		}
	}

	async function requestDataExport() {
		const res = await fetch('/api/settings/data-export', {
			method: 'POST'
		});
		if (!res.ok) {
			toast.error((await res.json()).message || 'Export failed');
			return;
		}
		exportStatus = 'processing';
		exportInterval = setInterval(checkExportStatus, 1000);
	}

	async function checkExportStatus() {
		const res = await fetch('/api/settings/data-export');
		if (!res.ok) {
			clearInterval(exportInterval);
			exportStatus = 'none';
			return;
		}

		const data = await res.json();
		if (data.status === 'processing') {
			exportProgress = data.progress;
		} else if (data.status === 'completed') {
			clearInterval(exportInterval);
			exportProgress = 100;
			exportStatus = 'completed';
			toast.success('Export ready! Click to download.');
		} else {
			clearInterval(exportInterval);
			exportStatus = 'none';
			exportProgress = 0;
		}
	}

	async function handleExportButtonClick() {
		if (exportStatus === 'completed') {
			exportStatus = 'downloading';
			try {
				const res = await fetch('/api/settings/data-export?action=download');
				if (!res.ok) throw new Error(`Failed to download`);

				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = 'user-data.json';
				a.click();
				URL.revokeObjectURL(url);

				exportStatus = 'none';
				exportProgress = 0;
			} catch {
				exportStatus = 'completed';
				toast.error('Download failed');
			}
		} else if (exportStatus === 'none') {
			requestDataExport();
		}
	}

	async function handleDeleteAccount() {
		if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
			return;
		}

		try {
			const res = await fetch('/api/settings', { method: 'DELETE' });
			if (!res.ok) throw new Error('Failed to delete account');
			toast.success('Account deleted successfully');
			goto('/login');
		} catch {
			toast.error('Failed to delete account');
		}
	}

	async function handleLogout() {
		try {
			await fetch('/api/users/logout', { method: 'POST' });
			goto('/login');
		} catch {
			toast.error('Failed to log out');
		}
	}

	async function handlePasswordChange() {
		if (!currentPassword || !newPassword || !confirmPassword) {
			toast.error('Please fill in all password fields.');
			return;
		}
		if (newPassword.length < 8) {
			toast.error('New password must be at least 8 characters.');
			return;
		}
		if (newPassword !== confirmPassword) {
			toast.error('New passwords do not match.');
			return;
		}

		passwordSubmitting = true;
		try {
			const res = await fetch('/api/settings/password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					current_password: currentPassword,
					new_password: newPassword,
					confirm_password: confirmPassword
				})
			});

			if (!res.ok) {
				let message = 'Failed to change password';
				try {
					const data = await res.json();
					if (data.message) message = data.message;
				} catch {
					// ignore
				}
				toast.error(message);
				return;
			}

			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			toast.success('Password changed successfully');
		} catch {
			toast.error('Failed to change password');
		} finally {
			passwordSubmitting = false;
		}
	}

	onDestroy(() => {
		if (exportInterval) clearInterval(exportInterval);
	});
</script>

<div class="container flex h-[calc(100vh-4rem)] max-w-5xl flex-col overflow-hidden">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="shrink-0 text-3xl font-bold">Settings</h1>
		{#if $USER_DATA}
			<Button variant="outline" class="flex items-center gap-2" onclick={handleLogout}>
				<LogOut class="h-4 w-4" />
				Log Out
			</Button>
		{/if}
	</div>

	<div class="mb-20 space-y-6 overflow-y-auto">
		{#if $USER_DATA}
			<Card.Root>
				<Card.Header>
					<Card.Title>Account Information</Card.Title>
					<Card.Description>Your account details and capabilities</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex items-center justify-between">
						<div class="flex flex-col gap-1">
							<Label class="font-medium">Email Address</Label>
							<Label class="text-muted-foreground text-sm">Your unique email address</Label>
						</div>
						<Label class="text-primary bg-muted rounded px-2 py-1">
							{$USER_DATA.username}@{$USER_DATA.domain}
						</Label>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Password</Card.Title>
					<Card.Description>Change your account password</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="current-password">Current Password</Label>
						<Input
							id="current-password"
							type="password"
							autocomplete="current-password"
							placeholder="Current password"
							bind:value={currentPassword}
						/>
					</div>
					<div class="space-y-2">
						<Label for="new-password">New Password</Label>
						<Input
							id="new-password"
							type="password"
							autocomplete="new-password"
							placeholder="At least 8 characters"
							bind:value={newPassword}
						/>
					</div>
					<div class="space-y-2">
						<Label for="confirm-password">Confirm New Password</Label>
						<Input
							id="confirm-password"
							type="password"
							autocomplete="new-password"
							placeholder="Re-enter new password"
							bind:value={confirmPassword}
						/>
					</div>
					<Button
						disabled={passwordSubmitting}
						onclick={handlePasswordChange}
						class="mt-2"
					>
						{passwordSubmitting ? 'Updating...' : 'Change Password'}
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Recovery Email</Card.Title>
					<Card.Description>Account recovery and password reset</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="recovery-email">Recovery Email</Label>
						<p class="text-muted-foreground text-sm">
							Used to send password reset links when you forget your password.
						</p>
						<Input
							id="recovery-email"
							type="email"
							placeholder="your.other@email.com"
							bind:value={recoveryEmail}
							disabled={recoveryLoading}
						/>
					</div>
					<div class="flex gap-2">
						<Button onclick={handleSaveRecovery} disabled={recoveryLoading || recoverySaving}>
							{recoverySaving ? 'Saving...' : 'Save recovery email'}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			{#if googleEnabled || googleLinked}
				<Card.Root>
					<Card.Header>
						<Card.Title>Google Account</Card.Title>
						<Card.Description>Sign in with Google or link it to your account</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border p-4">
							{#if googleLinked}
								<div class="flex items-center justify-between gap-4">
									<div class="min-w-0">
										<p class="font-medium">Linked: {googleEmail || 'Google account'}</p>
										<p class="text-muted-foreground text-sm">
											You can sign in with Google, and recover your account via its email address.
										</p>
									</div>
									<Button variant="outline" size="sm" onclick={handleUnlinkGoogle}>
										Unlink
									</Button>
								</div>
							{:else if googleEnabled}
								<div class="flex items-center justify-between gap-4">
									<div class="min-w-0">
										<p class="font-medium">Link a Google account</p>
										<p class="text-muted-foreground text-sm">
											Sign in with Google and use its email as your recovery address.
										</p>
									</div>
									<Button href="/auth/google/link" size="sm">Link Google</Button>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<Card.Root>
				<Card.Header>
					<Card.Title>Notifications</Card.Title>
					<Card.Description>Configure how you receive email notifications</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="rounded-lg border p-4">
						<div class="flex items-center justify-between">
							<div>
								<p class="font-medium">Desktop Notifications</p>
								<p class="text-muted-foreground text-sm">
									{notificationsEnabled
										? 'Notifications are enabled'
										: 'Click to enable notifications'}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<Switch
									id="desktop-notifications"
									checked={notificationsEnabled}
									onclick={handleToggleNotifications}
								/>

								{#if notificationsEnabled}
									<Tooltip.Root>
										<Tooltip.Trigger>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={sendTestNotification}
											>
												<TestTubeDiagonal class="h-4 w-4" />
											</Button>
										</Tooltip.Trigger>
										<Tooltip.Content>Send test notification</Tooltip.Content>
									</Tooltip.Root>
								{/if}
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Data Management</Card.Title>
					<Card.Description>Export or remove your account data</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Export Data Section -->
					<div class="rounded-lg border p-4">
						<div class="flex items-start justify-between">
							<div class="space-y-1">
								<p class="font-medium">Export Your Data</p>
								<p class="text-muted-foreground text-sm">
									Download a copy of your emails, settings, and attachments
								</p>
							</div>
							<Button
								variant="outline"
								disabled={exportStatus === 'processing' || exportStatus === 'downloading'}
								onclick={handleExportButtonClick}
								class="flex items-center gap-2"
							>
								<Download class="h-4 w-4" />
								{#if exportStatus === 'processing'}
									Preparing... ({exportProgress}%)
								{:else if exportStatus === 'completed'}
									Download Ready
								{:else if exportStatus === 'downloading'}
									Downloading...
								{:else}
									Export Data
								{/if}
							</Button>
						</div>
						{#if exportStatus === 'processing'}
							<Progress value={exportProgress} class="mt-4 h-2" />
						{/if}
						<p class="text-muted-foreground mt-2 text-xs">
							You can request a new export every 12 hours
						</p>
					</div>

					<div class="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
						<div class="flex items-start justify-between">
							<div class="space-y-1">
								<p class="font-medium">Delete Account</p>
								<p class="text-muted-foreground text-sm">
									Permanently remove your account and data
								</p>
							</div>
							<Button
								variant="destructive"
								class="flex items-center gap-2"
								onclick={handleDeleteAccount}
							>
								<Trash2 class="h-4 w-4" />
								Delete Account
							</Button>
						</div>
						<div class="mt-4 space-y-2">
							<p class="text-destructive text-sm font-medium">This action cannot be undone</p>
							<ul class="text-muted-foreground ml-4 list-disc space-y-1 text-sm">
								<li>Your username will be reserved to prevent impersonation</li>
								<li>Email conversations will be preserved for other participants</li>
								<li>
									Personal data including settings, drafts, and contacts will be permanently deleted
								</li>
							</ul>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Legal Information</Card.Title>
					<Card.Description>Review our policies and legal documents</Card.Description>
				</Card.Header>
				<Card.Content class="inline-flex gap-4">
					<a href="/legal/terms" class="text-primary hover:underline">Terms of Service</a>
					<a href="/legal/privacy" class="text-primary hover:underline">Privacy Policy</a>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>
