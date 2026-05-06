import Imap from "imap";
import { simpleParser } from "mailparser";
import { EmailItem } from "../types";

function connectToIMAP(): Promise<Imap> {
  return new Promise((resolve, reject) => {
    const host = process.env.EMAIL_HOST || "imap.ionos.es";
    const port = Number(process.env.EMAIL_PORT) || 993;
    const user = process.env.EMAIL_USER || "";
    const password = process.env.EMAIL_APP_PASSWORD || "";

    console.log(`Email: trying ${host}:${port} as ${user}`);

    const imap = new Imap({
      user: user,
      password: password,
      host: host,
      port: port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once("ready", () => resolve(imap));
    imap.once("error", (err: Error) => reject(err));
    imap.connect();
  });
}

export async function debugEmail(): Promise<string> {
  const lines: string[] = [];

  lines.push(`Host: ${process.env.EMAIL_HOST || "imap.ionos.es"}`);
  lines.push(`Port: ${process.env.EMAIL_PORT || "993"}`);
  lines.push(`User: ${process.env.EMAIL_USER || "MISSING"}`);
  lines.push(`Password: ${process.env.EMAIL_APP_PASSWORD ? "set (len=" + process.env.EMAIL_APP_PASSWORD.length + ")" : "MISSING"}`);

  try {
    const imap = await connectToIMAP();
    lines.push("Connected OK");

    return new Promise<string>((resolve) => {
      imap.getBoxes((err: Error | null, boxes) => {
        if (err) {
          lines.push("getBoxes error: " + err.message);
          imap.end();
          return resolve(lines.join("\n"));
        }

        lines.push(`Mailboxes: ${Object.keys(boxes || {}).join(", ")}`);

        imap.openBox("INBOX", true, (openErr: Error | null) => {
          if (openErr) {
            lines.push("openBox error: " + openErr.message);
            imap.end();
            return resolve(lines.join("\n"));
          }

          imap.search(["ALL"], (searchErr: Error | null, allResults: number[]) => {
            if (searchErr) {
              lines.push("search ALL error: " + searchErr.message);
              imap.end();
              return resolve(lines.join("\n"));
            }
            lines.push(`Total emails: ${allResults.length}`);

            imap.search(["UNSEEN"], (unseenErr: Error | null, unseenResults: number[]) => {
              if (unseenErr) {
                lines.push("search UNSEEN error: " + unseenErr.message);
                imap.end();
                return resolve(lines.join("\n"));
              }
              lines.push(`Unread emails: ${unseenResults.length}`);

              if (unseenResults.length > 0) {
                const recent = unseenResults.slice(-5);
                lines.push("Fetching last unread subjects...");

                const fetch = imap.fetch(recent, { bodies: "" });
                fetch.on("message", (msg) => {
                  const chunks: Buffer[] = [];
                  msg.on("body", (stream) => {
                    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
                    stream.on("end", async () => {
                      try {
                        const parsed = await simpleParser(Buffer.concat(chunks));
                        lines.push(`  FROM: ${parsed.from?.text || "unknown"}`);
                        lines.push(`  SUBJECT: ${parsed.subject || "(no subject)"}`);
                      } catch {
                        lines.push("  (failed to parse)");
                      }
                    });
                  });
                });
                fetch.on("end", () => {
                  imap.end();
                  resolve(lines.join("\n"));
                });
              } else {
                imap.end();
                resolve(lines.join("\n"));
              }
            });
          });
        });
      });
    });
  } catch (error) {
    lines.push(`Connection error: ${(error as Error).message}`);
    return lines.join("\n");
  }
}

export async function fetchUnansweredEmails(): Promise<EmailItem[]> {
  try {
    const imap = await connectToIMAP();

    return new Promise<EmailItem[]>((resolve) => {
      imap.openBox("INBOX", true, (err: Error | null) => {
        if (err) {
          console.error("Email: openBox error:", err.message);
          imap.end();
          return resolve([]);
        }

        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);
        const dateStr = sinceDate.toISOString().split("T")[0];

        imap.search(["UNSEEN", ["SINCE", dateStr]], (searchErr: Error | null, results: number[]) => {
          if (searchErr) {
            console.error("Email: search error:", searchErr.message);
            imap.end();
            return resolve([]);
          }

          if (!results.length) {
            imap.end();
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
                try {
                  const parsed = await simpleParser(Buffer.concat(chunks));
                  emails.push({
                    from: parsed.from?.text || "Unknown",
                    subject: parsed.subject || "(Sin asunto)",
                    date: parsed.date?.toLocaleDateString("es-ES") || "",
                  });
                } catch {
                  // Skip
                }
                processed++;
                if (processed === total) {
                  imap.end();
                  resolve(emails);
                }
              });
            });
          });

          fetch.on("error", () => {
            imap.end();
            resolve(emails.length > 0 ? emails : []);
          });
        });
      });
    });
  } catch (error) {
    console.error("Email: connection error:", (error as Error).message);
    return [];
  }
}
