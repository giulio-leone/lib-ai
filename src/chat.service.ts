/**
 * Chat Service
 *
 * Gestione conversazioni e parsing risposte AI
 * Implementa IChatService contract
 */

import { storageService, createId, getCurrentTimestamp } from '@onecoach/lib-shared';
import type { IStorageService } from '@onecoach/lib-shared';
import type { Message, Conversation, ParsedAiResponse, RequestType } from "@onecoach/types-chat";
import type { IChatService } from "@onecoach/contracts";

/**
 * Storage key
 */
const CONVERSATIONS_KEY = 'conversations';

/**
 * Implementazione Chat Service
 */
class ChatService implements IChatService {
  constructor(private storage: IStorageService) {}

  /**
   * Crea una nuova conversazione
   */
  createConversation(title?: string): Conversation {
    const now = getCurrentTimestamp();
    const conversation: Conversation = {
      id: createId(),
      messages: [],
      createdAt: now,
      updatedAt: now,
      title,
    };

    const conversations = this.getAllConversations();
    conversations.push(conversation);
    this.storage.set(CONVERSATIONS_KEY, conversations);

    return conversation;
  }

  /**
   * Ottiene una conversazione
   */
  getConversation(id: string): Conversation | null {
    const conversations = this.getAllConversations();
    return conversations.find((c: Conversation) => c.id === id) || null;
  }

  /**
   * Ottiene tutte le conversazioni
   */
  getAllConversations(): Conversation[] {
    return this.storage.get<Conversation[]>(CONVERSATIONS_KEY) || [];
  }

  /**
   * Aggiunge un messaggio a una conversazione
   */
  addMessage(conversationId: string, message: Omit<Message, 'id' | 'timestamp'>): Message | null {
    const conversations = this.getAllConversations();
    const index = conversations.findIndex((c) => c.id === conversationId);

    if (index === -1) {
      return null;
    }

    const conversation = conversations[index];
    if (!conversation) {
      return null;
    }

    const newMessage: Message = {
      ...message,
      id: createId(),
      timestamp: getCurrentTimestamp(),
    };

    conversation.messages.push(newMessage);
    conversation.updatedAt = getCurrentTimestamp();

    this.storage.set(CONVERSATIONS_KEY, conversations);

    return newMessage;
  }

  /**
   * Elimina una conversazione
   */
  deleteConversation(id: string): boolean {
    const conversations = this.getAllConversations();
    const filtered = conversations.filter((c: Conversation) => c.id !== id);

    if (conversations.length === filtered.length) {
      return false;
    }

    this.storage.set(CONVERSATIONS_KEY, filtered);
    return true;
  }

  /**
   * Parsing semplice della risposta AI
   * Può essere esteso con regex o logica più complessa
   */
  parseAiResponse<T>(response: string, type: RequestType): ParsedAiResponse<T> {
    try {
      // Cerca JSON nella risposta
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);

      if (jsonMatch && jsonMatch[1]) {
        const data = JSON.parse(jsonMatch[1]) as T;
        return {
          type,
          data,
          rawMessage: response,
          success: true,
        };
      }

      // Se non trova JSON strutturato, restituisce la risposta raw
      return {
        type,
        data: response as T,
        rawMessage: response,
        success: true,
      };
    } catch (error: unknown) {
      return {
        type,
        data: null as T,
        rawMessage: response,
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse AI response',
      };
    }
  }
}

/**
 * Singleton instance
 */
export const chatService: IChatService = new ChatService(storageService);
