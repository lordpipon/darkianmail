type ExportStatus = {
    progress: number;
    lastExport: number;
    blob?: Blob;
};

const exports = new Map<number, ExportStatus>();
const COOLDOWN = 12 * 60 * 60 * 1000; // 12 hours in ms

export const exportStore = {
    get: (userId: number) => exports.get(userId),
    set: (userId: number, status: ExportStatus) => exports.set(userId, status),
    canExport: (userId: number) => {
        const status = exports.get(userId);
        if (!status) return true;
        return Date.now() - status.lastExport > COOLDOWN;
    }
};
