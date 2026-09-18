import nodemailer, { type Transporter } from 'nodemailer';
import {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_SECURE
} from '$env/static/private';
import { PUBLIC_DOMAIN } from '$env/static/public';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
    if (transporter) return transporter;

    const numericPort = SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587;
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: numericPort,
        secure: SMTP_SECURE === 'true',
        auth: SMTP_USER
            ? {
                  user: SMTP_USER,
                  pass: SMTP_PASSWORD
              }
            : undefined
    });

    return transporter;
}

export async function sendTransactionalEmail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}): Promise<void> {
    await getTransporter().sendMail({
        from: `"Darkian Mail" <no-reply@${PUBLIC_DOMAIN}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html ?? undefined
    });
}

export { PUBLIC_DOMAIN };