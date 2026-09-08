const KEYWORDS: Record<Exclude<'promotions' | 'social' | 'forums' | 'updates', never>, Set<string>> = {
    promotions: new Set([
        'sale', 'discount', 'buy now', 'limited time', 'offer',
        'free shipping', 'coupon', 'deal', 'save', 'special'
    ]),
    social: new Set([
        'friend request', 'mentioned you', 'liked your post',
        'new follower', 'connection', 'following'
    ]),
    forums: new Set([
        'digest', 'thread', 'post reply', 'new topic',
        'unsubscribe from this group', 'mailing list'
    ]),
    updates: new Set([
        'receipt', 'order confirmation', 'invoice',
        'payment received', 'shipping update', 'account update'
    ])
};

export type EmailClassification = 'primary' | 'promotions' | 'social' | 'forums' | 'updates';

export function classifyEmail(subject: string | null, body: string | null, htmlBody: string | null): EmailClassification {
    const fullText = `${subject || ''} ${body || ''}`.toLowerCase();

    const scores: Record<string, number> = {
        promotions: 0,
        social: 0,
        forums: 0,
        updates: 0
    };

    for (const [category, keywords] of Object.entries(KEYWORDS)) {
        for (const keyword of keywords) {
            if (fullText.includes(keyword.toLowerCase())) {
                scores[category]++;
            }
        }
    }

    if (htmlBody) {
        const htmlScore = (htmlBody.match(/<img/g) || []).length +
            (htmlBody.match(/<table/g) || []).length +
            (htmlBody.match(/<style/g) || []).length;
        scores.promotions += Math.min(htmlScore, 5);
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
        const best = Object.entries(scores).find(([_, score]) => score === maxScore);
        return (best?.[0] as EmailClassification) || 'primary';
    }

    return 'primary';
}