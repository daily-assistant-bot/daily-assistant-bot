export interface DailySummary {
  date: string;
  news: NewsItem[];
  tasks: TaskItem[];
  emails: EmailItem[];
  whatsapp: WhatsAppItem[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary?: string;
}

export interface TaskItem {
  title: string;
  time: string;
  location?: string;
}

export interface EmailItem {
  from: string;
  subject: string;
  date: string;
}

export interface WhatsAppItem {
  from: string;
  message: string;
  timestamp: string;
}
