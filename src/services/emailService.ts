import Imap from "imap";
import { simpleParser } from "mailparser";
import { EmailItem } from "../types";

function connectToIMAP(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.EMAIL_USER || "",
      password: process.env.EMAIL_APP_PASSWORD || "",
      host: process.env.EMAIL_HOST || "imap.ionos.es",
      port: Number(process.env.EMAIL_PORT) || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once("ready", () => resolve(imap));
    imap.once("error", (err: Error) => reject(err));
    imap.connect();
  });
}

export async function fetchUnansweredEmails(): Promise<EmailItem[]> {
  console.log(`Email: connecting to ${process.env.EMAIL_HOST || "imap.ionos.es"} as ${process.env.EMAIL_USER || "unknown"}`);

  try {
    const imap = await connectToIMAP();
    console.log("Email: connected successfully");

    return new Promise<EmailItem[]>((resolve, reject) => {
      imap.openBox("INBOX", true, (err: Error | null) => {
        if (err) {
          imap.end();
          console.error("Email: failed to open INBOX:", err.message);
          return reject(err);
        }
        console.log("Email: INBOX opened");

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 1);
        const dateStr = sinceDate.toISOString().split("T")[0];

        imap.search(["UNSEEN", ["SINCE", dateStr]], (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            imap.end();
            console.error("Email: search error:", searchErr.message);
            return reject(searchErr);
          }

          if (!results.length) {
            imap.end();
            console.log("Email: no unread emails found");
            return resolve([]);
          }

          console.log(`Email: found ${results.length} unread emails`);
          const emails: EmailItem[] = [];
          let processed = 0;
          const total = results.length;

          const fetch = imap.fetch(results, { bodies: "" });

          fetch.on("message", (msg) => {
            const chunks: Buffer[] = [];
            msg.on("body", (stream) => {
              stream.on("data", (chunk: Buffer) => chunks.push(chunk));
              stream.on("end", async () => {
                const buffer = Buffer.concat(chunks);
                try {
                  const parsed = await simpleParser(buffer);
                  emails.push({
                    from: parsed.from?.text || "Unknown",
                    subject: parsed.subject || "(Sin asunto)",
                    date: parsed.date?.toLocaleDateString("es-ES") || "",
                  });
                  console.log(`Email: parsed "${parsed.subject || "(no subject)"}" from ${parsed.from?.text || "unknown"}`);
                } catch (parseErr) {
                  console.error("Email: failed to parse message:", parseErr);
                }
                processed++;
                if (processed === total) {
                  imap.end();
                  console.log(`Email: done, returning ${emails.length} emails`);
                  resolve(emails);
                }
              });
            });
          });

          fetch.on("error", (fetchErr: Error) => {
            imap.end();
            console.error("Email: fetch error:", fetchErr.message);
            reject(fetchErr);
          });
        });
      });
    });
  } catch (error) {
    console.error("Email: connection error:", (error as Error).message);
    return [];
  }
}
