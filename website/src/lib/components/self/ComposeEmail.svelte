<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Switch } from '$lib/components/ui/switch';
	import type { EmailContentType } from '$lib/types/email';
	import { PUBLIC_DOMAIN } from '$env/static/public';
	import { USER_DATA } from '$lib/stores/user';
	import type { DateValue } from '@internationalized/date';
	import { getLocalTimeZone } from '@internationalized/date';
	import DateTimePicker from './DateTimePicker.svelte';
	import type { Contact } from '$lib/types/contacts';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import { Send, Mail, Tag, Clock, Timer, AlertCircle, Check, LoaderCircle } from 'lucide-svelte';
	import Autocomplete from '$lib/components/self/Autocomplete.svelte';
	import * as DropdownMenu from '../ui/dropdown-menu';

	const EXPIRY_OPTIONS = [
		{ label: '10 minutes', minutes: 10 },
		{ label: '30 minutes', minutes: 30 },
		{ label: '1 hour', minutes: 60 },
		{ label: '3 hours', minutes: 180 },
		{ label: '6 hours', minutes: 360 },
		{ label: '12 hours', minutes: 720 },
		{ label: '24 hours', minutes: 1440 }
	];

	let { isOpen = $bindable(), initialDraft = null, onOpenChange = () => {} } = $props<{
		isOpen: boolean;
		initialDraft?: any;
		onOpenChange?: (open: boolean) => void;
	}>();

	let from = $state($USER_DATA!.username + '@' + PUBLIC_DOMAIN);
	let to = $state('');
	let subject = $state('');
	let body = $state('');
	let htmlMode = $state(false);
	let htmlBody = $state('');
	let status = $state('');
	let isStatusVisible = $state(false);
	let statusColor = $state<'default' | 'destructive' | 'success'>('default');
	let draftId = $state<number | null>(null);
	let autoSaveTimeout = $state<number | null>(null);
	let saveStatus = $state<'idle' | 'saving' | 'saved'>('idle');
	let scheduledDate = $state<DateValue | undefined>();
	let suggestions = $state<Array<{ label: string; value: string; tag: string | null }>>([]);
	let expiresAt = $state<Date | null>(null);
	let expiresLabel = $state<string | null>(null);
	let isBombEmail = $state(false);

	$effect(() => {
		if (initialDraft) {
			to = initialDraft.to_address || '';
			subject = initialDraft.subject || '';
			body = initialDraft.content_type === 'text/plain' ? initialDraft.body || '' : '';
			htmlBody = initialDraft.content_type === 'text/html' ? initialDraft.body || '' : '';
			htmlMode = initialDraft.content_type === 'text/html';
			draftId = initialDraft.id;
		}
	});

	async function saveDraft(content: {
		to: string;
		subject: string;
		body: string;
		contentType: string;
		htmlBody: string | null;
	}) {
		if (!content.to && !content.subject && !content.body && !content.htmlBody) return;
		if (saveStatus === 'saving') return;
		saveStatus = 'saving';
		try {
			const isUpdate = draftId !== null;
			const method = isUpdate ? 'PUT' : 'POST';
			const draftPayload = {
				id: draftId,
				to: content.to,
				subject: content.subject,
				body: content.body,
				contentType: content.contentType,
				htmlBody: content.htmlBody
			};
			const response = await fetch('/api/drafts', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(draftPayload)
			});
			if (response.ok) {
				const { id } = await response.json();
				if (!isUpdate) draftId = id;
				saveStatus = 'saved';
			} else {
				saveStatus = 'idle';
			}
		} catch {
			saveStatus = 'idle';
		}
	}

	async function deleteDraft() {
		if (!draftId) return;
		try {
			await fetch('/api/drafts', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id: draftId })
			});
		} catch {}
	}

	function scheduleAutoSave() {
		if (autoSaveTimeout) window.clearTimeout(autoSaveTimeout);
		saveStatus = 'idle';
		const content = {
			to,
			subject,
			body: htmlMode ? htmlBody : body,
			contentType: htmlMode ? 'text/html' : 'text/plain',
			htmlBody: htmlMode ? htmlBody : null
		};

		if (content.body || content.htmlBody) {
			autoSaveTimeout = window.setTimeout(() => saveDraft(content), 1500);
		}
	}

	function resetForm() {
		to = '';
		subject = '';
		body = '';
		htmlBody = '';
		htmlMode = false;
		isStatusVisible = false;
		draftId = null;
		saveStatus = 'idle';
		scheduledDate = undefined;
		expiresAt = null;
		expiresLabel = null;
		isBombEmail = false;
		if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
	}

	async function handleSubmit(event: { preventDefault: () => void }) {
		event.preventDefault();
		const contentType: EmailContentType = htmlMode ? 'text/html' : 'text/plain';
		isStatusVisible = true;
		statusColor = 'default';
		status = '';

		try {
			status = 'Preparing email...';
			statusColor = 'default';
			const emailData = {
				from,
				to,
				subject,
				body,
				content_type: contentType,
				html_body: htmlMode ? htmlBody : null,
				scheduled_at: scheduledDate ? scheduledDate.toDate(getLocalTimeZone()).toISOString() : null,
				expires_at: expiresAt ? expiresAt.toISOString() : null,
				self_destruct: isBombEmail
			};
			status = 'Sending email...';

			const response = await fetch('/api/emails/new', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(emailData)
			});
			const result = await response.json();

			if (response.ok) {
				await deleteDraft();

				status = scheduledDate ? 'Email scheduled successfully!' : 'Email sent successfully!';
				statusColor = 'success';

				isStatusVisible = true;

				setTimeout(() => {
					isOpen = false;
					resetForm();
				}, 2000);
			} else {
				status = result.message || response.statusText;
				statusColor = 'destructive';
			}
		} catch (error) {
			status = `Failed to send email: ${error}`;
			statusColor = 'destructive';
		}
	}

	async function handleSearch(query: string) {
		const response = await fetch(`/api/contacts?search=${query}`);
		if (response.ok) {
			const { contacts } = (await response.json()) as { contacts: Contact[] };
			suggestions = contacts.map((c) => ({
				label: `${c.full_name} <${c.email_address}>`,
				value: c.email_address,
				tag: c.tag
			}));
		} else {
			suggestions = [];
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open && (to || subject || body || htmlBody)) {
			saveDraft({
				to,
				subject,
				body: htmlMode ? htmlBody : body,
				contentType: htmlMode ? 'text/html' : 'text/plain',
				htmlBody: htmlMode ? htmlBody : null
			});
		}
		if (!open) {
			resetForm();
		}
		onOpenChange(open);
	}
</script>

<Dialog.Root bind:open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[700px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl">New Message</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				Compose your email message below.
			</Dialog.Description>
		</Dialog.Header>

		<form class="space-y-4 pt-4" onsubmit={handleSubmit}>
			<div class="space-y-4">
				<div class="flex items-center gap-4">
					<label for="to" class="w-20 text-sm font-medium">To:</label>
					<div class="flex-1">
						<Autocomplete
							id="to"
							icon={Mail}
							bind:value={to}
							{suggestions}
							placeholder="recipient@domain"
							onsearch={handleSearch}
						/>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<label for="subject" class="w-20 text-sm font-medium">Subject:</label>
					<div class="flex-1">
						<IconInput
							id="subject"
							icon={Tag}
							type="text"
							bind:value={subject}
							placeholder="Subject"
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="html-mode" class="text-sm font-medium">Message:</label>
						<div class="flex items-center gap-2">
							<Label for="html-mode" class="text-muted-foreground text-sm">Rich text</Label>
							<Switch id="html-mode" bind:checked={htmlMode} />
						</div>
					</div>

					{#if htmlMode}
						<Textarea
							id="html-body"
							bind:value={htmlBody}
							oninput={scheduleAutoSave}
							class="min-h-[300px] font-mono"
							placeholder="<p>Write your message here...</p>"
						/>
					{:else}
						<Textarea
							id="body"
							bind:value={body}
							oninput={scheduleAutoSave}
							class="min-h-[300px]"
							placeholder="Write your message here..."
						/>
					{/if}
				</div>
			</div>

			<div class="space-y-4 border-t pt-4">
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label class="text-sm font-medium">Email Expiration</Label>
						<p class="text-muted-foreground text-xs">
							Email will be automatically deleted after this date
						</p>
					</div>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger disabled={isBombEmail}>
							<Button variant="outline" size="sm" disabled={isBombEmail}>
								<Timer class="h-4 w-4" />
								{expiresLabel ? `Expires in ${expiresLabel}` : 'Set expiry'}
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-36 p-2">
							{#each EXPIRY_OPTIONS as option}
								<DropdownMenu.Item
									onclick={() => {
										const d = new Date();
										d.setMinutes(d.getMinutes() + option.minutes);
										expiresAt = d;
										expiresLabel = option.label;
										isBombEmail = false;
									}}
									class="cursor-pointer"
								>
									{option.label}
								</DropdownMenu.Item>
							{/each}
							<DropdownMenu.Separator />
							<DropdownMenu.Item
								onclick={() => {
									expiresAt = null;
									expiresLabel = null;
								}}
								class="data-[highlighted]:bg-destructive/20 data-[highlighted]:text-destructive mt-1 cursor-pointer"
							>
								Clear expiry
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>

				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label class="text-sm font-medium">Self-destruct after reading</Label>
						<p class="text-muted-foreground text-xs">
							Email will be deleted once opened by recipient
						</p>
					</div>
					<Switch
						bind:checked={isBombEmail}
						onchange={(e: Event) => {
							isBombEmail = (e.target as HTMLInputElement).checked;
							if (isBombEmail) {
								expiresAt = null;
								expiresLabel = null;
							}
						}}
						disabled={!!expiresAt}
					/>
				</div>
			</div>

			<Dialog.Footer class="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-end">
				<button 
					type="button" 
					class="text-muted-foreground hover:text-foreground w-full text-center text-sm underline transition-colors sm:w-auto sm:text-left" 
					onclick={() => (isOpen = false)}
				>
					Cancel
				</button>
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<DateTimePicker 
						date={scheduledDate} 
						onChange={(date) => (scheduledDate = date)} 
					/>
					<Button type="submit" class="w-full sm:w-auto">
						{#if scheduledDate}
							<Clock class="h-4 w-4" />
							Schedule
						{:else}
							<Send class="h-4 w-4" />
							Send
						{/if}
					</Button>
				</div>
			</Dialog.Footer>

			{#if isStatusVisible}
				<Alert class="mt-4">
					<div class="flex items-start gap-2">
						{#if statusColor === 'destructive'}
							<AlertCircle class="h-5 w-5" />
						{:else if statusColor === 'success'}
							<Check class="h-5 w-5 text-green-600" />
						{:else}
							<LoaderCircle class="text-primary h-5 w-5 animate-spin" />
						{/if}
						<div class="flex-1">
							<AlertDescription class="whitespace-pre-wrap">{status}</AlertDescription>
						</div>
					</div>
				</Alert>
			{/if}
		</form>
	</Dialog.Content>
</Dialog.Root>
