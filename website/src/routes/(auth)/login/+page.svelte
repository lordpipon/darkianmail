<script lang="ts">
    import { enhance } from '$app/forms';
    import type { ActionData } from './$types';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
    import { AlertCircle } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { toast } from 'svelte-sonner';

    let { form }: { form: ActionData } = $props();
    let username = $state('');
    let password = $state('');
    let isSubmitting = $state(false);
    let googleEnabled = $state(false);

    const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
        google_disabled: 'Google sign-in is not configured yet.',
        google_cancelled: 'Google sign-in was cancelled or failed.',
        google_expired: 'That sign-in attempt expired. Please try again.',
        google_already_linked: 'This Google account is linked to another Darkian Mail user.',
        please_login: 'Please sign in first to link your Google account.',
        banned: 'This account is banned.'
    };

    onMount(async () => {
        const error = page.url.searchParams.get('error');
        if (error && GOOGLE_ERROR_MESSAGES[error]) {
            toast.error(GOOGLE_ERROR_MESSAGES[error]);
        }
        try {
            const res = await fetch('/auth/google/status').catch(() => null);
            if (res?.ok) {
                const data = await res.json();
                googleEnabled = !!data.enabled;
            }
        } catch (e) {
            // ignore, hide Google button
        }
    });

    function handleSubmit() {
        if (!username || !password) {
            return false;
        }
        isSubmitting = true;
    }

    $effect(() => {
        if (form) {
            isSubmitting = false;
            if (!form.success) {
                password = '';
            }
        }
    });
</script>

<div class="relative flex h-screen items-center justify-center">
    <Button href="/" variant="ghost" size="sm" class="absolute left-4 top-4">← Back to Home</Button>
    <Card class="w-[400px]">
        <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Welcome back! Please sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
            <form
                method="POST"
                use:enhance={() => {
                    handleSubmit();
                    return async ({ update }) => {
                        await update();
                    };
                }}
            >
                {#if form?.error}
                    <Alert variant="destructive" class="mb-4">
                        <AlertCircle class="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{form.error}</AlertDescription>
                    </Alert>
                {/if}

                <div class="grid gap-4">
                    <div class="grid gap-2">
                        <Label for="username">Username or email</Label>
                        <Input
                            id="username"
                            name="username"
                            bind:value={username}
                            required
                            disabled={isSubmitting}
                            autocomplete="username"
                            placeholder="username or user@darkian.xyz"
                        />
                    </div>
                    <div class="grid gap-2">
                        <Label for="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            bind:value={password}
                            required
                            disabled={isSubmitting}
                            autocomplete="current-password"
                        />
                    </div>
                    <Button type="submit" class="w-full" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in...' : 'Sign in'}
                    </Button>

                    <div class="flex items-center justify-between text-sm">
                        <a href="/forgot-password" class="text-muted-foreground underline-offset-4 hover:underline">
                            Forgot password?
                        </a>
                        <a href="/signup" class="text-muted-foreground underline-offset-4 hover:underline">
                            Create account
                        </a>
                    </div>

                    {#if googleEnabled}
                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <span class="w-full border-t" />
                            </div>
                            <div class="relative flex justify-center text-xs uppercase">
                                <span class="bg-background text-muted-foreground px-2">or</span>
                            </div>
                        </div>
                        <Button href="/auth/google/login" variant="outline" class="w-full">
                            Continue with Google
                        </Button>
                    {/if}
                </div>
            </form>
        </CardContent>
    </Card>
</div>