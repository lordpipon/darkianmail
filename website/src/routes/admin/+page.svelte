<script lang="ts">
    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { Search } from 'lucide-svelte';
    import IconInput from '$lib/components/self/IconInput.svelte';
    import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';

    let { data } = $props();
    let searchQuery = $state('');
    let bannedUsers = $state(data.bannedUsers);

    let filteredUsers = $derived(
        bannedUsers.filter((user) =>
            `${user.username}#${user.domain}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    function formatDate(date: string | Date) {
        return new Date(date).toLocaleDateString();
    }

    async function handleUnban(userId: number) {
        try {
            const res = await fetch(`/api/admin/users/${userId}/unban`, {
                method: 'POST'
            });

            if (res.ok) {
                bannedUsers = bannedUsers.filter((u) => u.id !== userId);
                toast.success('User unbanned successfully!');
            }
        } catch (error) {
            console.error('Failed to unban user:', error);
            toast.error('Failed to unban user. Please try again.');
        }
    }
</script>

<div class="container max-w-5xl">
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Banned Users</Card.Title>
					<Card.Description>Manage banned user accounts</Card.Description>
				</div>
				<IconInput
					type="search"
					icon={Search}
					placeholder="Search users..."
					bind:value={searchQuery}
					class="w-[200px]"
				/>
			</div>
		</Card.Header>
		<Card.Content>
			{#if filteredUsers.length === 0}
				<div class="text-muted-foreground py-8 text-center">
					{searchQuery ? 'No banned users found matching your search' : 'No banned users'}
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Username</Table.Head>
							<Table.Head>Domain</Table.Head>
							<Table.Head>Banned Date</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredUsers as user}
							<Table.Row>
								<Table.Cell class="font-medium">{user.username}</Table.Cell>
								<Table.Cell>{user.domain}</Table.Cell>
								<Table.Cell>{formatDate(user.created_at)}</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="outline" size="sm" onclick={() => handleUnban(user.id)}>
										Unban
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
