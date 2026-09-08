<script lang="ts">
	import { CalendarClock } from 'lucide-svelte';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import { buttonVariants } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import {
		DateFormatter,
		type DateValue,
		getLocalTimeZone,
		today,
		CalendarDateTime
	} from '@internationalized/date';

	let props = $props<{
		date: DateValue | undefined;
		onChange: (date: DateValue | undefined) => void;
		label?: string;
		icon?: typeof import('lucide-svelte').Icon;
	}>();

	let selectedHours = $state<number>(
		props.date ? props.date.toDate(getLocalTimeZone()).getHours() : 12
	);
	let selectedMinutes = $state<number>(
		props.date ? props.date.toDate(getLocalTimeZone()).getMinutes() : 0
	);

	const df = new DateFormatter('en-US', {
		dateStyle: 'full',
		timeStyle: 'short'
	});

	let scheduledDate = $state<DateValue | undefined>(props.date);

	function updateTime(hours: number, minutes: number) {
		if (!scheduledDate) return;

		selectedHours = hours;
		selectedMinutes = minutes;

		const currentDate = scheduledDate.toDate(getLocalTimeZone());
		const newDate = new CalendarDateTime(
			currentDate.getFullYear(),
			currentDate.getMonth() + 1,
			currentDate.getDate(),
			hours,
			minutes
		);
		props.onChange(newDate);
	}

	$effect(() => {
		scheduledDate = props.date;
	});

	$effect(() => {
		if (scheduledDate) {
			props.onChange(scheduledDate);

			const currentDate = scheduledDate.toDate(getLocalTimeZone());
			if (
				currentDate.getHours() !== selectedHours ||
				currentDate.getMinutes() !== selectedMinutes
			) {
				const newDate = new CalendarDateTime(
					currentDate.getFullYear(),
					currentDate.getMonth() + 1,
					currentDate.getDate(),
					selectedHours,
					selectedMinutes
				);
				props.onChange(newDate);
			}
		} else {
			props.onChange(undefined);
		}
	});
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			buttonVariants({ variant: 'outline' }),
			'gap-2',
			!props.date && 'text-muted-foreground'
		)}
	>
		{#if props.icon}
			<props.icon class="h-4 w-4" />
		{:else}
			<CalendarClock class="h-4 w-4" />
		{/if}
		{props.date ? df.format(props.date.toDate(getLocalTimeZone())) : props.label || 'Schedule'}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0">
		<Calendar
			type="single"
			bind:value={scheduledDate}
			initialFocus
			minValue={today(getLocalTimeZone())}
		/>

		<div class="flex gap-2 border-t p-3">
			<div class="grid w-full grid-cols-3 gap-2">
				<div class="relative">
					<select
						class="border-input bg-popover ring-offset-background focus:ring-ring w-full appearance-none rounded-md border px-3 py-2 text-sm"
						value={selectedHours > 12
							? (selectedHours - 12).toString().padStart(2, '0')
							: selectedHours === 0
								? '12'
								: selectedHours.toString().padStart(2, '0')}
						onchange={(e) => {
							const hourValue = parseInt(e.currentTarget.value);
							const adjustedHour =
								selectedHours >= 12
									? hourValue === 12
										? 12
										: hourValue + 12
									: hourValue === 12
										? 0
										: hourValue;
							updateTime(adjustedHour, selectedMinutes);
						}}
					>
						{#each Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)) as hour}
							<option value={hour.toString().padStart(2, '0')}>
								{hour.toString().padStart(2, '0')}
							</option>
						{/each}
					</select>
					<div class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-chevron-down"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</div>
				</div>

				<!-- Minutes dropdown with custom arrow -->
				<div class="relative">
					<select
						class="border-input bg-popover ring-offset-background focus:ring-ring w-full appearance-none rounded-md border px-3 py-2 text-sm"
						value={selectedMinutes.toString().padStart(2, '0')}
						onchange={(e) => {
							updateTime(selectedHours, parseInt(e.currentTarget.value));
						}}
					>
						{#each Array.from({ length: 12 }, (_, i) => i * 5) as minute}
							<option value={minute.toString().padStart(2, '0')}>
								{minute.toString().padStart(2, '0')}
							</option>
						{/each}
					</select>
					<div class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-chevron-down"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</div>
				</div>

				<!-- AM/PM dropdown with custom arrow -->
				<div class="relative">
					<select
						class="border-input bg-popover ring-offset-background focus:ring-ring w-full appearance-none rounded-md border px-3 py-2 text-sm"
						value={selectedHours >= 12 ? 'PM' : 'AM'}
						onchange={(e) => {
							const period = e.currentTarget.value;
							const currentHour = selectedHours % 12;
							const newHour =
								period === 'PM'
									? currentHour === 0
										? 12
										: currentHour + 12
									: currentHour === 12
										? 0
										: currentHour;
							updateTime(newHour, selectedMinutes);
						}}
					>
						<option value="AM">AM</option>
						<option value="PM">PM</option>
					</select>
					<div class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lucide lucide-chevron-down"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</div>
				</div>
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
