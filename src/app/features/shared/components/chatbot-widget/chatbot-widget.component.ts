import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ChatbotService } from '../../services/chatbot.service';

@Component({
  selector: 'app-chatbot-widget',
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChatbotWidgetComponent implements OnInit {
  isOpen = false;
  showTooltip = true;
  messages: { from: 'user' | 'bot'; text: string; timestamp: Date }[] = [
    {
      from: 'bot',
      text: "Hello! I'm Yeffa's agricultural assistant. How can I help you learn about farming today?",
      timestamp: new Date()
    }
  ];
  input = '';
  quickTopics: string[] = ['Crop rotation tips', 'Soil health', 'Pest management', 'Irrigation methods'];
  sending = false;
  typing = false;

  constructor(private chatbot: ChatbotService) {}

  trackByMessage(index: number, item: { from: 'user'|'bot'; text: string; timestamp: Date }) {
    return index;
  }

  trackByTopic(index: number, item: string) {
    return item;
  }

  send(): void {
    const text = this.input.trim();
    if (!text) return;
    this.messages.push({ from: 'user', text, timestamp: new Date() });
    this.input = '';
    this.scrollToBottom();
    this.queryBot(text);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.showTooltip) {
      this.showTooltip = false;
      try { localStorage.setItem('chat_tooltip_dismissed', '1'); } catch {}
    }
  }

  ngOnInit(): void {
    try {
      const dismissed = localStorage.getItem('chat_tooltip_dismissed') === '1';
      if (dismissed) this.showTooltip = false;
    } catch {
      // ignore storage errors
    }
  }

  onQuick(topic: string): void {
    this.messages.push({ from: 'user', text: topic, timestamp: new Date() });
    this.scrollToBottom();
    this.queryBot(topic);
  }

  private queryBot(text: string): void {
    if (this.sending) return;
    this.sending = true;
    this.typing = true;
    this.chatbot.sendMessage(text).subscribe({
      next: (reply) => {
        const textOut = (reply && reply.trim()) ? reply : "I'm not sure I understood that.";
        this.messages.push({ from: 'bot', text: textOut, timestamp: new Date() });
        this.scrollToBottom();
      },
      error: () => {
        this.messages.push({ from: 'bot', text: 'Chat service unavailable. Please try again later.', timestamp: new Date() });
        this.scrollToBottom();
      },
      complete: () => { this.sending = false; this.typing = false; }
    });
  }


  private scrollToBottom(): void {
    // Defer to allow DOM to render first
    setTimeout(() => {
      const panel = document.querySelector('.chat-messages');
      if (panel) {
        (panel as HTMLElement).scrollTop = (panel as HTMLElement).scrollHeight;
      }
    });
  }
}
