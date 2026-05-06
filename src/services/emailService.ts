import Imap from "imap";
import { simpleParser, ParsedMail } from "mailparser";
import { EmailItem } from "../types";

function connectToIMAP(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER || "",
      password: process.env.EMAIL_APP_PASSWORD || "",
      host: process.env.EMAIL_HOST || "imap.mail.me.com",
      port: Number(process.env.EMAIL_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once("ready", () => resolve(imap));
    imap.once("error", (err: Error) => reject(err));
    imap.connect();
  });
}

function parseEmail(messageBuffer: Buffer): Promise<ParsedMail> {
  return new Promise((resolve, reject) => {
    simpleParser(messageBuffer, (err: Error | null, parsed) => {
      if (err) return reject(err);
      resolve(parsed);
    });
  });
}

export async function fetchUnansweredEmails(): Promise<EmailItem[]> {
  try {
    const imap = await connectToIMAP();

    return new Promise<EmailItem[]>((resolve, reject) => {
      imap.openBox("INBOX", false, (err: Error | null) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 1);
        const dateStr = sinceDate.toISOString().split("T")[0];

        imap.search(["UNSEEN", ["SINCE", dateStr]], (searchErr: Error | null, results: number[]) => {
          if (searchErr || !results.length) {
            imap.end();
            if (searchErr) return reject(searchErr);
            return resolve([]);
          }

          const emails: EmailItem[] = [];
          const fetch = imap.fetch(results, { bodies: "" });

          fetch.on("message", (msg) => {
            msg.on("body", (stream) => {
              const chunks: Buffer[] = [];
              stream.on("data", (chunk: Buffer) => chunks.push(chunk));
              stream.on("end", async () => {
                try {
                  const parsed = await parseEmail(Buffer.concat(chunks));
                  emails.push({
                    from: parsed.from?.text || "Unknown",
                    subject: parsed.subject || "(Sin asunto)",
                    date: parsed.date?.toLocaleDateString("es-ES") || "",
                  });
                } catch {
                  // Skip malformed emails
                }
              });
            });
          });

          fetch.on("end", () => {
            imap.end();
            resolve(emails);
          });

          fetch.on("error", (fetchErr: Error) => {
            imap.end();
            reject(fetchErr);
          });
        });
      });
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    return [];
  }
}
