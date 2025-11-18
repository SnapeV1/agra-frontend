import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  Ticket,
  TicketMessage,
  TicketThreadResponse,
  TicketStatus
} from '../models/ticket.model';

export interface CreateTicketPayload {
  subject: string;
  message: string;
}

export interface SendTicketMessageRequest {
  content: string;
}

export interface UpdateTicketStatusPayload {
  status: TicketStatus;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private readonly baseUrl = `${environment.apiBaseUrl}/tickets`;

  constructor(private http: HttpClient) {}

  createTicket(payload: CreateTicketPayload, attachment?: File): Observable<TicketThreadResponse> {
    if (attachment) {
      const formData = new FormData();
      formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      formData.append('attachment', attachment);
      return this.http.post<TicketThreadResponse>(this.baseUrl, formData);
    }
    return this.http.post<TicketThreadResponse>(this.baseUrl, payload);
  }

  getMyTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.baseUrl}/my`);
  }

  getAllTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.baseUrl);
  }

  getTicketThread(ticketId: string): Observable<TicketThreadResponse> {
    return this.http.get<TicketThreadResponse>(`${this.baseUrl}/${ticketId}`);
  }

  sendMessage(ticketId: string, payload: SendTicketMessageRequest, attachment?: File): Observable<TicketMessage> {
    if (attachment) {
      const formData = new FormData();
      formData.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      formData.append('attachment', attachment);
      return this.http.post<TicketMessage>(`${this.baseUrl}/${ticketId}/message`, formData);
    }
    return this.http.post<TicketMessage>(`${this.baseUrl}/${ticketId}/message`, payload);
  }

  closeTicket(ticketId: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${ticketId}/close`, {});
  }

  updateTicketStatus(ticketId: string, payload: UpdateTicketStatusPayload): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.baseUrl}/${ticketId}/status`, payload);
  }
}
