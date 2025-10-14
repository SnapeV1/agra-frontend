import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-chatbot-widget',
  templateUrl: './chatbot-widget.component.html',
  styleUrls: ['./chatbot-widget.component.css']
})
export class ChatbotWidgetComponent implements OnInit {
  isOpen = false;
  showTooltip = true;
  messages: { from: 'user' | 'bot'; text: string; timestamp: Date }[] = [
    {
      from: 'bot',
      text: "Hello! I'm YEFFA's agricultural assistant. How can I help you learn about farming today?",
      timestamp: new Date()
    }
  ];
  input = '';
  quickTopics: string[] = ['Crop rotation tips', 'Soil health', 'Pest management', 'Irrigation methods'];

  send(): void {
    const text = this.input.trim();
    if (!text) return;
    this.messages.push({ from: 'user', text, timestamp: new Date() });
    this.input = '';
    setTimeout(() => {
      this.messages.push({ from: 'bot', text: this.getBotReply(text), timestamp: new Date() });
      this.scrollToBottom();
    }, 800);
    this.scrollToBottom();
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
    setTimeout(() => {
      this.messages.push({ from: 'bot', text: this.getBotReply(topic), timestamp: new Date() });
      this.scrollToBottom();
    }, 800);
    this.scrollToBottom();
  }

  private getBotReply(text: string): string {
    const t = text.toLowerCase();
    if (t.includes('crop')) return 'Crop rotation helps prevent soil nutrient loss and pests. Would you like examples?';
    if (t.includes('soil')) return 'Healthy soil is key! Compost and regular testing can improve fertility.';
    if (t.includes('pest')) return 'Use Integrated Pest Management — combining natural and cultural methods.';
    if (t.includes('irrigation') || t.includes('water')) return 'Drip irrigation and mulching save up to 50% of water.';
    return "That's a great question! YEFFA offers courses on farming and sustainability.";
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
