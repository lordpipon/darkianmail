<script lang="ts">
	import { storageUsage } from '$lib/stores/storage';
	import { formatFileSize } from '$lib/utils';
	import { Database } from 'lucide-svelte';
	import * as Sidebar from '../ui/sidebar';

	let percentage = $derived(($storageUsage.usage / $storageUsage.limit) * 100);
	let color = $derived(
		percentage > 90 ? 'bg-destructive' : percentage > 75 ? 'bg-warning' : 'bg-primary'
	);
</script>

<Sidebar.MenuItem>
	<div class="flex w-full flex-col">
		<div class="flex items-center gap-2 p-2">
			<Database class="h-4 w-4" />
			<span>Storage</span>
		</div>
		<div class="pb-3 pl-9 pr-3">
			<div class="flex items-center gap-2">
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
					<div class="h-full transition-all {color}" style="width: {percentage}%"></div>
				</div>
			</div>
			<div class="mt-1 text-xs text-muted-foreground">
				{formatFileSize($storageUsage.usage)} of {formatFileSize($storageUsage.limit)} used
			</div>
		</div>
	</div>
</Sidebar.MenuItem>
