<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Contact, NewContact } from '$lib/types/contacts';
	import { Pen, Trash, Search, UserPlus, User, Mail, Tag } from 'lucide-svelte';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import { getInitials, getRandomColor } from '$lib/utils';

	let contacts = $state<Contact[]>([]);
	let searchQuery = $state('');
	let isAddContactOpen = $state(false);
	let isEditContactOpen = $state(false);
	let editingContact = $state<Contact | null>(null);
	let isLoading = $state(true);

	let newContact = $state<NewContact>({
		fullName: '',
		email: '',
		tag: ''
	});

	type EditingState = {
		fullName: string;
		emailAddress: string;
		tag: string | undefined;
	};

	let editingState = $state<EditingState>({
		fullName: '',
		emailAddress: '',
		tag: undefined
	});

	async function loadContacts() {
		isLoading = true;
		const response = await fetch(`/api/contacts${searchQuery ? `?search=${searchQuery}` : ''}`);
		if (response.ok) {
			const data = await response.json();
			contacts = data.contacts;
		}
		isLoading = false;
	}

	async function handleSubmit() {
		const response = await fetch('/api/contacts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newContact)
		});

		if (response.ok) {
			toast.success(`Contact '${newContact.fullName}' saved successfully`);
			isAddContactOpen = false;

			newContact = {
				fullName: '',
				email: '',
				tag: ''
			};
			await loadContacts();
		} else {
			const data = await response.json();
			toast.error(data.error || 'Failed to save contact');
		}
	}

	async function handleDelete(contact: Contact) {
		const response = await fetch(`/api/contacts?id=${contact.id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			toast.success(`Contact '${contact.full_name}' deleted`);
			await loadContacts();
		} else {
			toast.error('Failed to delete contact');
		}
	}

	async function handleEdit() {
		if (!editingContact) return;

		const response = await fetch(`/api/contacts?id=${editingContact.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				fullName: editingState.fullName,
				email: editingState.emailAddress,
				tag: editingState.tag
			})
		});

		if (response.ok) {
			toast.success(`Contact updated successfully`);
			isEditContactOpen = false;
			editingContact = null;
			await loadContacts();
		} else {
			const data = await response.json();
			toast.error(data.error || 'Failed to update contact');
		}
	}

	function startEdit(contact: Contact) {
		editingState = {
			fullName: contact.full_name,
			emailAddress: contact.email_address,
			tag: contact.tag ?? undefined
		};
		editingContact = contact;
		isEditContactOpen = true;
	}

	$effect(() => {
		loadContacts();
	});
</script>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h1 class="text-3xl font-bold tracking-tight">My Contacts</h1>
		<Button class="flex items-center gap-2" onclick={() => (isAddContactOpen = true)}>
			<UserPlus class="h-4 w-4" />
			<span>Add Contact</span>
		</Button>
	</div>

	<div class="relative mb-6">
		<IconInput
			type="search"
			icon={Search}
			placeholder="Search contacts by name, email or tag..."
			bind:value={searchQuery}
			oninput={() => loadContacts()}
		/>
	</div>

	{#if isLoading}
		<div class="flex h-40 items-center justify-center">
			<div
				class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
			></div>
		</div>
	{:else if contacts.length === 0}
		<div
			class="border-border flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
		>
			<User class="text-muted-foreground mb-2 h-12 w-12" />
			<h3 class="text-lg font-medium">No contacts found</h3>
			<p class="text-muted-foreground text-sm">
				{searchQuery ? 'Try a different search term or' : 'Get started by'} adding a new contact.
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each contacts as contact}
				<div
					class="border-border group overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md"
				>
					<div class="flex items-start space-x-4 p-4">
						<div
							class={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${getRandomColor(contact.full_name)}`}
						>
							<span class="text-sm font-medium">{getInitials(contact.full_name)}</span>
						</div>
						<div class="min-w-0 flex-1">
							<h3 class="text-card-foreground truncate text-base font-semibold">
								{contact.full_name}
							</h3>
							<div class="text-muted-foreground mt-1 flex items-center text-xs">
								<Mail class="h-3 w-3" />
								<span class="truncate">{contact.email_address}</span>
							</div>
							{#if contact.tag}
								<div class="mt-2">
									<Badge variant="outline">
										<Tag class="h-3 w-3" />
										{contact.tag}
									</Badge>
								</div>
							{/if}
						</div>
					</div>
					<div class="border-border bg-card flex items-center justify-end gap-2 border-t p-2">
						<Button
							variant="ghost"
							size="sm"
							class="h-8 w-8 rounded-full p-0"
							onclick={() => startEdit(contact)}
							title="Edit contact"
						>
							<Pen class="h-4 w-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="hover:bg-destructive/10 hover:text-destructive h-8 w-8 rounded-full p-0"
							onclick={() => handleDelete(contact)}
							title="Delete contact"
						>
							<Trash class="h-4 w-4" />
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ADD CONTACT FORM -->
<Dialog.Root bind:open={isAddContactOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl">Add New Contact</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				Fill in the details to add a new contact to your list.
			</Dialog.Description>
		</Dialog.Header>
		<form class="space-y-4 pt-4" onsubmit={handleSubmit}>
			<div class="space-y-2">
				<label for="fullName" class="text-sm font-medium">Full Name</label>
				<IconInput
					id="fullName"
					icon={User}
					placeholder="John Doe"
					bind:value={newContact.fullName}
					required
				/>
			</div>
			<div class="space-y-2">
				<label for="email" class="text-sm font-medium">Email Address</label>
				<IconInput
					id="email"
					icon={Mail}
					placeholder="john#example.com"
					bind:value={newContact.email}
					required
				/>
			</div>
			<div class="space-y-2">
				<label for="tag" class="text-sm font-medium">Tag (Optional)</label>
				<IconInput
					id="tag"
					icon={Tag}
					placeholder="Work, Family, Friend, etc."
					bind:value={newContact.tag}
				/>
			</div>
			<Dialog.Footer class="mt-6 flex justify-between">
				<Button variant="outline" onclick={() => (isAddContactOpen = false)}>Cancel</Button>
				<Button type="submit">Save Contact</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- EDIT CONTACT FORM -->
<Dialog.Root bind:open={isEditContactOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title class="text-xl">Edit Contact</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				Make changes to the contact information below.
			</Dialog.Description>
		</Dialog.Header>
		<form
			class="space-y-4 pt-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleEdit();
			}}
		>
			<div class="space-y-2">
				<label for="fullName" class="text-sm font-medium">Full Name</label>
				<IconInput
					id="fullName"
					icon={User}
					placeholder="John Doe"
					bind:value={editingState.fullName}
					required
				/>
			</div>
			<div class="space-y-2">
				<label for="email" class="text-sm font-medium">Email Address</label>
				<IconInput
					id="email"
					icon={Mail}
					placeholder="john#example.com"
					bind:value={editingState.emailAddress}
					required
				/>
			</div>
			<div class="space-y-2">
				<label for="tag" class="text-sm font-medium">Tag (Optional)</label>
				<IconInput
					id="tag"
					icon={Tag}
					placeholder="Work, Family, Friend, etc."
					bind:value={editingState.tag}
				/>
			</div>
			<Dialog.Footer class="mt-6 flex justify-between">
				<Button variant="outline" onclick={() => (isEditContactOpen = false)}>Cancel</Button>
				<Button type="submit">Save Changes</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
