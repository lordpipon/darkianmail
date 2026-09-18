<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Search, ShieldCheck, ShieldX, Trash2, Ban, Undo2, Crown, UserX } from 'lucide-svelte';
	import IconInput from '$lib/components/self/IconInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';

	type AdminUser = {
		id: number;
		username: string;
		domain: string;
		is_admin: boolean;
		is_banned: boolean;
		iq: number | null;
		recovery_email: string | null;
		deleted_at: string | null;
		created_at: string;
	};

	let { data } = $props();
	let users = $state<AdminUser[]>(data.users as unknown as AdminUser[]);
	let stats = $state(data.stats as unknown as { total: number; banned: number; admins: number });
	let searchQuery = $state('');
	let busyId = $state<number | null>(null);

	let filteredUsers = $derived(
		users.filter(
			(u) =>
				`${u.username}@${u.domain} ${u.recovery_email ?? ''}`
					.toLowerCase()
					.includes(searchQuery.toLowerCase())
		)
	);

	function formatDate(value: string | Date | null) {
		if (!value) return '—';
		return new Date(value).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	async function runAction(user: AdminUser, action: 'ban' | 'unban' | 'set_admin' | 'delete') {
		if (action === 'delete') {
			if (!confirm(`Delete account "${user.username}"? This locks them out permanently.`)) return;
		}
		if (action === 'set_admin') {
			if (!confirm(`${user.is_admin ? 'Revoke admin from' : 'Make'} "${user.username}" admin?`)) return;
		}
		busyId = user.id;
		try {
			const res = await fetch(`/api/admin/users/${user.id}/action`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action,
					admin: action === 'set_admin' ? !user.is_admin : undefined
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || 'Request failed');
			}
			if (action === 'ban') {
				user.is_banned = true;
				stats.banned++;
				toast.success(`${user.username} banned`);
			} else if (action === 'unban') {
				user.is_banned = false;
				stats.banned--;
				toast.success(`${user.username} unbanned`);
			} else if (action === 'set_admin') {
				user.is_admin = !user.is_admin;
				stats.admins += user.is_admin ? 1 : -1;
				toast.success(user.is_admin ? `${user.username} is now admin` : `${user.username} is no longer admin`);
			} else {
				users = users.filter((u) => u.id !== user.id);
				stats.total--;
				toast.success(`${user.username} deleted`);
			}
		} catch (e: any) {
			toast.error(e.message || 'Failed to perform action');
		} finally {
			busyId = null;
		}
	}
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-3xl">{stats.total}</Card.Title>
				<Card.Description>Total users</Card.Description>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-3xl">{stats.banned}</Card.Title>
				<Card.Description class="flex items-center gap-2">Banned <UserX class="h-4 w-4" /></Card.Description>
			</Card.Header>
		</Card.Root>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-3xl">{stats.admins}</Card.Title>
				<Card.Description class="flex items-center gap-2">Admins <Crown class="h-4 w-4" /></Card.Description>
			</Card.Header>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<Card.Title>Users</Card.Title>
					<Card.Description>Manage accounts on Darkian Mail</Card.Description>
				</div>
				<div class="w-full sm:w-72">
					<IconInput type="search" icon={Search} placeholder="Search users..." bind:value={searchQuery} />
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>User</Table.Head>
						<Table.Head class="hidden md:table-cell">Recovery email</Table.Head>
						<Table.Head class="hidden sm:table-cell">IQ</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="hidden md:table-cell">Created</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredUsers as user (user.id)}
						<Table.Row>
							<Table.Cell>
								<span class="flex flex-wrap items-center gap-2 font-medium">
									{user.username}@{user.domain}
									{#if user.id === data.activeUserId}
										<Badge variant="secondary">you</Badge>
									{/if}
								</span>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">
								{user.recovery_email ?? '—'}
							</Table.Cell>
							<Table.Cell class="hidden sm:table-cell">{user.iq ?? '—'}</Table.Cell>
							<Table.Cell>
								<span class="flex flex-wrap gap-1">
									{#if user.is_admin}
										<Badge>Admin</Badge>
									{/if}
									{#if user.is_banned}
										<Badge variant="destructive">Banned</Badge>
									{/if}
								</span>
							</Table.Cell>
							<Table.Cell class="hidden md:table-cell">{formatDate(user.created_at)}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									{#if user.is_banned}
										<Button
											variant="outline"
											size="sm"
											disabled={busyId === user.id}
											onclick={() => runAction(user, 'unban')}
										>
											<Undo2 class="h-4 w-4" />
											<span class="hidden sm:inline">Unban</span>
										</Button>
									{:else}
										<Button
											variant="outline"
											size="sm"
											disabled={busyId === user.id || user.id === data.activeUserId}
											onclick={() => runAction(user, 'ban')}
											title="Ban"
										>
											<Ban class="h-4 w-4" />
											<span class="hidden sm:inline">Ban</span>
										</Button>
									{/if}
									<Button
										variant="outline"
										size="sm"
										disabled={busyId === user.id || user.id === data.activeUserId}
										onclick={() => runAction(user, 'set_admin')}
										title={user.is_admin ? 'Revoke admin' : 'Make admin'}
									>
										{#if user.is_admin}
											<ShieldX class="h-4 w-4" />
										{:else}
											<ShieldCheck class="h-4 w-4" />
										{/if}
									</Button>
									<Button
										variant="outline"
										size="sm"
										class="hover:bg-destructive/10 hover:text-destructive"
										disabled={busyId === user.id || user.id === data.activeUserId}
										onclick={() => runAction(user, 'delete')}
										title="Delete"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="6" class="text-muted-foreground py-8 text-center">
								No users found{searchQuery ? ' for that search' : ''}.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>