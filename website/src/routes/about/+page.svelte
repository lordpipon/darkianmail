<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Mail, Github, Globe, AtSign, ArrowLeft, Home } from 'lucide-svelte';
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>About | Darkian Mail</title>
	<meta name="description" content="About Darkian Mail, a free email service. Contact the founder lordpipon." />
	<meta property="og:title" content="About Darkian Mail" />
	<meta property="og:url" content={page.url.href} />
</svelte:head>

<div class="container mx-auto max-h-screen max-w-4xl overflow-y-auto py-10">
	<div class="mb-6 flex justify-start">
		<Button href="/" variant="outline" size="sm" class="gap-2">
			<Home class="h-4 w-4" /> Home
		</Button>
	</div>
	<Card.Root class="mb-20 p-6">
		<div class="mb-8 flex items-center gap-3">
			<div class="bg-primary/10 rounded-lg p-3">
				<AtSign class="text-primary h-10 w-10" />
			</div>
			<div>
				<h1 class="text-4xl font-bold">About Darkian Mail</h1>
				<p class="text-muted-foreground">A free email service, just for you.</p>
			</div>
		</div>

		<Separator class="my-6" />

		<div class="space-y-6">
			<section>
				<h2 class="text-2xl font-semibold">What is Darkian Mail?</h2>
				<p>
					Darkian Mail is a free, self-hosted email platform built on standard SMTP. You get a real
					<code class="bg-muted rounded px-1">you@darkian.xyz</code> address, full control over your data,
					and none of the price tags — it's free, and it stays free.
				</p>
			</section>

			<section>
				<h2 class="text-2xl font-semibold">The Founder</h2>
				<div class="bg-card mt-4 flex flex-col items-center gap-4 rounded-lg border p-6 sm:flex-row">
					<img
						src="/testimonials/lordpipon.png"
						alt="lordpipon"
						class="h-24 w-24 rounded-full object-cover"
					/>
					<div class="text-center sm:text-left">
						<h3 class="text-xl font-semibold">lordpipon</h3>
						<p class="text-muted-foreground text-sm">Founder &amp; CEO</p>
						<p class="text-muted-foreground mt-2 text-sm">
							Built Darkian Mail to put email back in the hands of the people who use it.
						</p>
					</div>
				</div>
			</section>

			<section>
				<h2 class="text-2xl font-semibold">Contact</h2>
				<div class="mt-4 space-y-2">
					<a
						href="mailto:lordpipon@gmail.com"
						class="text-primary hover:underline"
					>
						<Mail class="text-muted-foreground mr-2 inline h-4 w-4" />
						lordpipon@gmail.com
					</a>
					<br />
					<a
						href="mailto:lordpipon@darkian.xyz"
						class="text-primary hover:underline"
					>
						<Mail class="text-muted-foreground mr-2 inline h-4 w-4" />
						lordpipon@darkian.xyz
					</a>
					<br />
					<a href="https://github.com/lordpipon" target="_blank" rel="noopener" class="text-primary hover:underline">
						<Github class="text-muted-foreground mr-2 inline h-4 w-4" />
						GitHub (@lordpipon)
					</a>
					<br />
					<a
						href="https://bsky.app/profile/lordpipon.com"
						target="_blank"
						rel="noopener"
						class="text-primary hover:underline"
					>
						<AtSign class="text-muted-foreground mr-2 inline h-4 w-4" />
						Bluesky (@lordpipon.com)
					</a>
					<br />
					<a href="https://lordpipon.com" target="_blank" rel="noopener" class="text-primary hover:underline">
						<Globe class="text-muted-foreground mr-2 inline h-4 w-4" />
						https://lordpipon.com
					</a>
				</div>
			</section>

			<div class="mt-8 flex justify-center">
				<Button href="/" variant="outline" class="gap-2">
					<ArrowLeft class="h-4 w-4" />
					Back to Home
				</Button>
			</div>
		</div>
	</Card.Root>
</div>