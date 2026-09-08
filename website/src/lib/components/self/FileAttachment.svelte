<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Progress } from '$lib/components/ui/progress';
    import { FileDown, Upload, X, AlertCircle } from 'lucide-svelte';
    import { formatFileSize } from '$lib/utils';
	import { Badge } from '../ui/badge';
    
    let {
        filename,
        filesize,
        progress = null,
        status = 'pending',
        showRemove = false,
        showDownload = false,
        onRemove = undefined
    } = $props<{
        filename: string;
        filesize: number;
        progress?: number | null;
        status?: 'pending' | 'uploading' | 'complete' | 'error';
        showRemove?: boolean;
        showDownload?: boolean;
        onRemove?: () => void;
    }>();

    function getFileNameParts(name: string) {
        const lastDotIndex = name.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === 0) {
            return { name, ext: '' };
        }
        return {
            name: name.slice(0, lastDotIndex),
            ext: name.slice(lastDotIndex + 1).toLowerCase()
        };
    }

    const { name, ext } = getFileNameParts(filename);
</script>

<div class="hover:bg-accent hover:text-accent-foreground flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 transition-colors">
    {#if showDownload && status === 'complete'}
        <FileDown class="h-4 w-4 flex-shrink-0" />
    {:else}
        <Upload class="h-4 w-4 flex-shrink-0" />
    {/if}

    <div class="min-w-0 flex-1">
        <div class="flex flex-col">
            <div class="flex items-center">
                <span class="truncate text-sm font-medium">{name}</span>
                <span class="flex-shrink-0 text-sm font-medium">.{ext}</span>
            </div>
            <span class="text-xs text-muted-foreground">
                {formatFileSize(filesize)}
            </span>
        </div>
        {#if status === 'uploading'}
            <Progress value={progress} class="mt-2 h-1" />
        {:else if status === 'error'}
            <Badge variant="destructive" class="px-1.5 py-0.5 text-[10px]">Error</Badge>
        {:else if status === 'complete'}
            <!-- Optionally show a 'Complete' badge or checkmark -->
        {/if}
    </div>

    {#if showRemove && onRemove}
        <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 flex-shrink-0"
            onclick={onRemove}
        >
            <X class="h-4 w-4" />
        </Button>
    {/if}
    {#if status === 'error'}
        <AlertCircle class="text-destructive h-4 w-4" />
    {/if}
</div>
