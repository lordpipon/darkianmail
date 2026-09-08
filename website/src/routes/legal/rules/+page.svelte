<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import * as Card from '$lib/components/ui/card';
	import ScrollText from 'lucide-svelte/icons/scroll-text';
import { Button } from '$lib/components/ui/button';
import { Home } from 'lucide-svelte';
import { page } from '$app/state';

	const LAST_UPDATED = 'September 9, 2026';
	const CONTACT_EMAIL = 'admin@darkian.xyz';
</script>

<svelte:head>
	<title>Rules | Darkian Mail</title>
	<meta name="description" content="Community and usage rules for the Darkian Mail email service." />
	<meta property="og:title" content="Rules | Darkian Mail" />
	<meta
		property="og:description"
		content="Community and usage rules for the Darkian Mail email service."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.href} />
</svelte:head>

<div
	class="container mx-auto max-h-screen max-w-4xl overflow-y-auto py-10 [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden"
>
	<div class="mb-6 flex justify-start">
		<Button href="/" variant="outline" size="sm" class="gap-2">
			<Home class="h-4 w-4" /> Home
		</Button>
	</div>
	<Card.Root class="mb-20 p-6">
		<div class="mb-8 flex items-center gap-3">
			<ScrollText class="text-primary h-10 w-10" />
			<div>
				<h1 class="text-4xl font-bold">Rules</h1>
				<p class="text-muted-foreground">Last updated: {LAST_UPDATED}</p>
			</div>
		</div>

		<Separator class="my-6" />

		<div class="prose prose-sm dark:prose-invert max-w-none space-y-6 md:prose-base">
			<section>
				<h2>1. Scope</h2>
				<p>
					These rules apply to anyone using a Darkian Mail account. By keeping your account you agree
					to follow them. Breaking the rules may result in a warning, account suspension, or permanent
					ban without notice depending on severity.
				</p>
			</section>

			<section>
				<h2>2. Do not spam</h2>
				<p>
					Unsolicited bulk mail (spam) of any kind is strictly forbidden. This includes mass mailings,
					chain letters, list harvesting, and snowshoe spam. Every message you send must be intended
					for a specific person (or an obvious invite/notification they signed up for).
				</p>
			</section>

			<section>
				<h2>3. No illegal content</h2>
				<p>
					Do not use Darkian Mail to transmit, store, or organize illegal material, including content
					that violates the laws of the jurisdiction where we operate. This includes, but is not
					limited to: fraud, scam operations, weapons or explosives trafficking, and CSAM of any kind.
				</p>
			</section>

			<section>
				<h2>4. No phishing or malware</h2>
				<p>
					Sending phishing emails, credential-harvesting pages, malware, ransomware, or exploiting
					recipients to give up personal data is an immediate ban. The same applies to phishing
					impersonations of Darkian Mail itself.
				</p>
			</section>

			<section>
				<h2>5. No impersonation</h2>
				<p>
					Do not register or use an address to impersonate a real person, business, or organization.
					Spoofing <code class="bg-muted rounded px-1">@darkian.xyz</code> sender identities that you
					do not own is forbidden.
				</p>
			</section>

			<section>
				<h2>6. Respect other users</h2>
				<p>
					No threats, targeted harassment, stalking, or doxxing through the service. Treat other
					people's email as private — don't forward or publish a private conversation without
					permission.
				</p>
			</section>

			<section>
				<h2>7. One account per person</h2>
				<p>
					You are allowed one active account. Don't create throwaway or "burner" accounts to dodge a
					suspension, and don't sell or transfer account ownership.
				</p>
			</section>

			<section>
				<h2>8. Enforcement</h2>
				<p>
					We may inspect account activity where required by law or to stop abuse. The most common
					consequences are:
				</p>
				<ul class="ml-6 list-disc space-y-1">
					<li><strong>Warning</strong> for minor, first-time offenses.</li>
					<li><strong>Temporary suspension</strong> for repeated or moderate violations.</li>
					<li><strong>Permanent ban</strong> for spam, illegal content, phishing, or impersonation.</li>
				</ul>
			</section>

			<section>
				<h2>9. Reporting violations</h2>
				<p>
					Abused a service? Report us: <strong>{CONTACT_EMAIL}</strong> — include the full headers and
					the content you received so we can act quickly.
				</p>
			</section>

			<section>
				<h2>10. Changes to these rules</h2>
				<p>
					These rules may be updated as the service grows. Significant changes will be announced. You
					are responsible for reviewing them periodically.
				</p>
			</section>

		</div>
	</Card.Root>
</div>