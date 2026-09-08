<script lang="ts">
    import EmailList from '$lib/components/self/EmailList.svelte';
    
    let { data } = $props();
</script>

<EmailList emails={data.emails} showRecipient={false} />