declare module 'mailparser' {
    export interface AddressObject {
        value?: Array<{ address?: string; name?: string }>;
    }

    export interface Attachment {
        content?: Buffer;
        filename?: string;
        size?: number;
        contentType: string;
    }

    export interface ParsedMail {
        subject?: string;
        text?: string;
        html?: string;
        from?: AddressObject;
        to?: AddressObject;
        messageId?: string;
        inReplyTo?: string;
        references?: string;
        attachments?: Attachment[];
    }

    export function simpleParser(input: unknown, options?: object): Promise<ParsedMail>;
}