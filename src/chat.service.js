/**
 * Chat Service
 *
 * Gestione conversazioni e parsing risposte AI
 * Implementa IChatService contract
 */
import { storageService, createId, getCurrentTimestamp } from '@giulio-leone/lib-shared';
/**
 * Storage key
 */
const CONVERSATIONS_KEY = 'conversations';
/**
 * Implementazione Chat Service
 */
class ChatService {
  storage;
  constructor(storage) {
    this.storage = storage;
  }
  /**
   * Crea una nuova conversazione
   */
  createConversation(title) {
    const now = getCurrentTimestamp();
    const conversation = {
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
  getConversation(id) {
    const conversations = this.getAllConversations();
    return conversations.find((c) => c.id === id) || null;
  }
  /**
   * Ottiene tutte le conversazioni
   */
  getAllConversations() {
    return this.storage.get(CONVERSATIONS_KEY) || [];
  }
  /**
   * Aggiunge un messaggio a una conversazione
   */
  addMessage(conversationId, message) {
    const conversations = this.getAllConversations();
    const index = conversations.findIndex((c) => c.id === conversationId);
    if (index === -1) {
      return null;
    }
    const conversation = conversations[index];
    if (!conversation) {
      return null;
    }
    const newMessage = {
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
  deleteConversation(id) {
    const conversations = this.getAllConversations();
    const filtered = conversations.filter((c) => c.id !== id);
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
  parseAiResponse(response, type) {
    try {
      // Cerca JSON nella risposta
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        const data = JSON.parse(jsonMatch[1]);
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
        data: response,
        rawMessage: response,
        success: true,
      };
    } catch (error) {
      return {
        type,
        data: null,
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
export const chatService = new ChatService(storageService);
