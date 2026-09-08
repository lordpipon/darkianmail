<script lang="ts">
    import EmailList from '$lib/components/self/EmailList.svelte';
    
    let { data } = $props();
</script>

<EmailList emails={data.emails} showStatus={true} showRecipient={true} />