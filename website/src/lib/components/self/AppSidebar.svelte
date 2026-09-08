<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import {
		Moon,
		Sun,
		Home,
		Inbox,
		Star,
		Clock,
		Send,
		NotepadTextIcon,
		ClockFading,
		CircleAlert,
		UsersRound,
		ArrowDown,
		ArrowUp,
		PenSquare,
		Settings,
		ShieldAlert,
		FileText
	} from 'lucide-svelte';
	import { mode, setMode } from 'mode-watcher';
	import type { HTMLAttributes } from 'svelte/elements';
	import { currentTab } from '$lib/stores/navigation';
	import Button from '../ui/button/button.svelte';
	import ComposeEmail from '$lib/components/self/ComposeEmail.svelte';
	import StorageUsageBar from './StorageUsageBar.svelte';
	import { USER_DATA } from '$lib/stores/user';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js'; // Import the hook

	const data = {
		navMain: [
			{ title: 'Home', url: '/', icon: Home },
			{ title: 'Inbox', url: '/inbox', icon: Inbox },
			{ title: 'Starred', url: '/starred', icon: Star },
			{ title: 'Snoozed', url: '/snoozed', icon: Clock },
			{ title: 'Sent', url: '/sent', icon: Send },
			{ title: 'Drafts', url: '/drafts', icon: NotepadTextIcon }
		],
		navMore: [
			{ title: 'Contacts', url: '/contacts', icon: UsersRound },
			{ title: 'Scheduled', url: '/scheduled', icon: ClockFading },
			{ title: 'Spam', url: '/spam', icon: CircleAlert },
			{ title: 'Settings', url: '/settings', icon: Settings }
		],
		navAdmin: [{ title: 'Admin', url: '/admin', icon: ShieldAlert }]
	};
	let isExpanded = $state(false);
	let showCompose = $state(false);
	type MenuButtonProps = HTMLAttributes<HTMLAnchorElement | HTMLButtonElement>;

	const { setOpenMobile } = useSidebar();

	function handleNavClick(title: string) {
		$currentTab = title;

		setOpenMobile(false);
	}

	function handleComposeClick() {
		showCompose = true;
		setOpenMobile(false);
	}

	function handleModeToggle() {
		setMode(mode.current === 'light' ? 'dark' : 'light');
		setOpenMobile(false);
	}
</script>

<ComposeEmail bind:isOpen={showCompose} />

<Sidebar.Root collapsible="offcanvas" variant="inset">
	<Sidebar.Header>
		<div class="flex items-center gap-1 px-2 py-2">
			<img src="/logo.png" class="h-8 w-8" alt="darkianmail" />
			<div class="flex items-center gap-2">
				<span class="text-base font-semibold">Darkian Mail</span>
				{#if $USER_DATA?.is_admin}
					<span class="text-muted-foreground text-xs">| Admin</span>
				{/if}
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child()}
								<Button onclick={handleComposeClick} class={`mb-4 h-[3.0rem] w-36`}>
									<PenSquare />
									<span>Compose</span>
								</Button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
					{#each data.navMain as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props }: { props: MenuButtonProps })}
									<a
										href={item.url || '/'}
										onclick={() => handleNavClick(item.title)}
										class={`${
											$currentTab === item.title ? 'bg-accent text-accent-foreground' : ''
										} ${props.class}`}
									>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props }: { props: MenuButtonProps })}
								<button
									onclick={() => (isExpanded = !isExpanded)}
									{...props}
									class={`${isExpanded ? 'bg-sidebar-accent' : ''} ${props.class}`}
								>
									{#if isExpanded}
										<ArrowUp />
									{:else}
										<ArrowDown />
									{/if}
									<span>{isExpanded ? 'Show less' : 'Show more'}</span>
								</button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>

					<!-- Conditional rendering for additional items -->
					{#if isExpanded}
						{#each data.navMore as item}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton>
									{#snippet child({ props }: { props: MenuButtonProps })}
										<a
											href={item.url || '/'}
											onclick={() => handleNavClick(item.title)}
											class={`${
												$currentTab === item.title ? 'bg-accent text-accent-foreground' : ''
											} ${props.class}`}
										>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}

						{#if $USER_DATA?.is_admin}
							{#each data.navAdmin as item}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton>
										{#snippet child({ props }: { props: MenuButtonProps })}
											<a
												href={item.url}
												onclick={() => handleNavClick(item.title)}
												class={`${$currentTab === item.title ? 'bg-accent text-accent-foreground' : ''} ${props.class}`}
											>
												<item.icon />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
						{/if}

						<Sidebar.MenuItem>
							<StorageUsageBar />
						</Sidebar.MenuItem>
					{/if}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props }: { props: MenuButtonProps })}
								<button onclick={handleModeToggle} {...props}>
									{#if mode.current === 'light'}
										<Moon class="h-5 w-5" />
										<span>Dark Mode</span>
									{:else}
										<Sun class="h-5 w-5" />
										<span>Light Mode</span>
									{/if}
								</button>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
</Sidebar.Root>
