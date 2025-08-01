import { Chat } from "../models/chat.model";
import { ChatMessage } from "../models/chat-message.model";
import { User } from "../models/user.model";
import { LLMService, LLMResponse } from "./llm.service";
import { Embedding } from "../models/embedding.model";
import { EmbeddingService } from "./embedding.service";

export interface CreateChatRequest {
  query: string;
  userId: number;
  title?: string;
}

export interface ChatQueryRequest {
  query: string;
  chatId: string;
  userId: number;
}

export interface ChatResponse {
  id: string;
  title: string;
  description?: string;
  userId: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
  messageCount?: number;
  lastMessage?: {
    role: string;
    content: string;
    createdAt: Date;
  };
}

export interface QueryResponse {
  chatId: string;
  query: string;
  answer: string;
  llmMetadata: {
    tokensUsed: number;
    model: string;
    processingTime: number;
  };
  messageId: string;
}

export class ChatService {
  private llmService: LLMService;
  private embeddingService: EmbeddingService;

  constructor() {
    this.llmService = new LLMService();
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Get all chats for a user with message summaries
   * @param userId - User ID to get chats for
   * @param includeMessages - Whether to include recent messages
   * @returns Array of chats with metadata
   */
  async getChats(
    userId: number,
    includeMessages: boolean = false
  ): Promise<ChatResponse[]> {
    try {
      const includeClause: any = [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ];

      if (includeMessages) {
        includeClause.push({
          model: ChatMessage,
          as: "messages",
          limit: 1,
          order: [["createdAt", "DESC"]],
          attributes: ["role", "content", "createdAt"],
        });
      }

      const chats = await Chat.findAll({
        where: {
          userId,
          status: "active",
        },
        include: includeClause,
        order: [["updatedAt", "DESC"]],
      });

      const chatResponses: ChatResponse[] = [];

      for (const chat of chats) {
        // Get message count
        const messageCount = await ChatMessage.count({
          where: { chatId: chat.id },
        });

        // Get last message
        const lastMessage = await ChatMessage.findOne({
          where: { chatId: chat.id },
          order: [["createdAt", "DESC"]],
          attributes: ["role", "content", "createdAt"],
        });

        chatResponses.push({
          id: chat.id,
          title: chat.title,
          description: chat.description,
          userId: chat.userId,
          status: chat.status,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          metadata: chat.metadata,
          messageCount,
          lastMessage: lastMessage
            ? {
                role: lastMessage.role,
                content:
                  lastMessage.content.substring(0, 100) +
                  (lastMessage.content.length > 100 ? "..." : ""),
                createdAt: lastMessage.createdAt,
              }
            : undefined,
        });
      }

      return chatResponses;
    } catch (error: any) {
      console.error("Error getting chats:", error);
      throw new Error(`Failed to get chats: ${error.message}`);
    }
  }

  /**
   * Create a new chat with the first query (RAG-enabled)
   * @param chatData - Chat creation data with initial query
   * @returns Created chat with first response
   */
  async createChat(chatData: CreateChatRequest): Promise<QueryResponse> {
    const startTime = Date.now();

    try {
      // Verify user exists
      const user = await User.findByPk(chatData.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate title if not provided
      let title = chatData.title;
      if (!title) {
        title = await this.llmService.generateChatTitle(chatData.query);
      }

      // Create the chat
      const chat = await Chat.create({
        title,
        userId: chatData.userId,
        status: "active",
        metadata: {
          totalMessages: 0,
          lastQueryTime: new Date(),
          totalTokensUsed: 0,
        },
      } as any);

      // Process the first query
      const queryResponse = await this.processQuery({
        query: chatData.query,
        chatId: chat.id,
        userId: chatData.userId,
      });

      return queryResponse;
    } catch (error: any) {
      console.error("Error creating chat:", error);
      throw new Error(`Failed to create chat: ${error.message}`);
    }
  }

  /**
   * Process a query using direct LLM interaction
   * @param queryData - Query data
   * @returns Query response with LLM answer
   */
  async processQuery(queryData: ChatQueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();

    try {
      // Verify chat exists and user has access
      const chat = await Chat.findOne({
        where: {
          id: queryData.chatId,
          userId: queryData.userId,
          status: "active",
        },
      });

      if (!chat) {
        throw new Error("Chat not found or access denied");
      }

      // Get chat history for context
      const recentMessages = await ChatMessage.findAll({
        where: { chatId: queryData.chatId },
        order: [["createdAt", "DESC"]],
        limit: 10,
        attributes: ["role", "content"],
      });

      const chatHistory = recentMessages.reverse().map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Generate LLM response without vector search

      const query_embeddings = await this.embeddingService.getEmbedding(
        queryData.query
      );

      const result = await Embedding.searchDocumentsByEmbedding(
        query_embeddings,
        3
      );

      const context = result
        .map((doc) => `documentId: ${doc.documentId}\nContent: ${doc.content}`)
        .join("\n\n");

      const prompt = `
# Query Analysis and Response Task

## System Identity:
You are Atlas AI, an intelligent assistant specialized in helping users find relevant information. When asked about your identity, respond with: "I am Atlas AI, and I'm here to help you find relevant information based on the available data and context."

## User Query:
${queryData.query}

## Available Context:
${context}

## Instructions:
You are an expert analyst tasked with providing accurate, evidence-based answers. Follow these guidelines:

### 1. Context Analysis
- Carefully examine the provided context for relevant information
- Identify key facts, data points, and evidence that directly relate to the query
- Note any limitations or gaps in the available information

### 2. Answer Requirements
- **Accuracy First**: Only provide information that can be directly supported by the given context
- **Be Specific**: Include relevant details, numbers, dates, and examples from the context
- **Stay Focused**: Address the specific question asked without unnecessary tangents
- **Cite Sources**: When possible, reference specific parts of the context that support your answer

### 3. Handling Insufficient Information
If the context does not contain enough information to fully answer the query:
- Clearly state what aspects you can answer based on available context
- Identify specific information gaps
- Ask targeted clarifying questions such as:
  - "Could you provide more context about [specific aspect]?"
  - "To give you a complete answer, I need information about [missing element]"
  - "The context covers [X] but doesn't address [Y]. Could you clarify [specific question]?"

### 4. Response Format
Structure your response as follows:
- Start with a clear, concise answer to the main question
- Provide relevant context and evidence
- Indicate how confident you are in your answer based on available context
- If needed, ask specific questions for clarification

### 5. Quality Checks
Before responding, verify:
- Does your answer directly address the query?
- Is every claim supported by the provided context?
- Have you avoided making assumptions beyond the given information?
- Is your response clear and actionable?

## Examples of Good Clarifying Questions:
- "The context mentions [topic] but doesn't specify [detail]. What specific aspect of [topic] are you most interested in?"
- "I can answer [part A] based on the context, but for [part B], could you provide information about [specific need]?"
- "The data shows [finding], but to provide actionable recommendations, could you clarify your [goal/constraint/timeframe]?"

Please provide your response following these guidelines.
`;

      console.log("🤖 Generating LLM response");
      const llmResponse: LLMResponse = await this.llmService.generateResponse(
        prompt,
        "", // No context from vector search
        chatHistory
      );

      const processingTime = Date.now() - startTime;

      // Save user message
      const userMessage = await ChatMessage.create({
        chatId: queryData.chatId,
        role: "user",
        content: queryData.query,
        metadata: {
          processingTime,
        },
      } as any);

      // Save assistant response
      const assistantMessage = await ChatMessage.create({
        chatId: queryData.chatId,
        role: "assistant",
        content: llmResponse.answer,
        metadata: {
          tokensUsed: llmResponse.tokensUsed.total,
          model: llmResponse.model,
          processingTime,
        },
      } as any);

      // Update chat metadata
      const currentMetadata = chat.metadata || {};
      await chat.update({
        metadata: {
          ...currentMetadata,
          totalMessages: (currentMetadata.totalMessages || 0) + 2,
          lastQueryTime: new Date(),
          totalTokensUsed:
            (currentMetadata.totalTokensUsed || 0) +
            llmResponse.tokensUsed.total,
        },
        updatedAt: new Date(),
      });

      return {
        chatId: queryData.chatId,
        query: queryData.query,
        answer: llmResponse.answer,
        llmMetadata: {
          tokensUsed: llmResponse.tokensUsed.total,
          model: llmResponse.model,
          processingTime,
        },
        messageId: assistantMessage.id,
      };
    } catch (error: any) {
      console.error("Error processing query:", error);
      throw new Error(`Failed to process query: ${error.message}`);
    }
  }

  /**
   * Get a single chat by ID with messages
   * @param chatId - Chat ID
   * @param userId - User ID (for authorization)
   * @param includeMessages - Whether to include chat messages
   * @returns Chat details with messages
   */
  async getChatById(
    chatId: string,
    userId: number,
    includeMessages: boolean = true
  ): Promise<{
    chat: ChatResponse;
    messages?: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
      metadata?: any;
    }>;
  }> {
    try {
      const chat = await Chat.findOne({
        where: {
          id: chatId,
          userId,
          status: "active",
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "email", "firstName", "lastName"],
          },
        ],
      });

      if (!chat) {
        throw new Error("Chat not found");
      }

      const chatResponse: ChatResponse = {
        id: chat.id,
        title: chat.title,
        description: chat.description,
        userId: chat.userId,
        status: chat.status,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        metadata: chat.metadata,
      };

      let messages;
      if (includeMessages) {
        const chatMessages = await ChatMessage.findAll({
          where: { chatId },
          order: [["createdAt", "ASC"]],
          attributes: ["id", "role", "content", "createdAt", "metadata"],
        });

        messages = chatMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
          metadata: msg.metadata,
        }));
      }

      return { chat: chatResponse, messages };
    } catch (error: any) {
      console.error("Error getting chat by ID:", error);
      throw new Error(`Failed to get chat: ${error.message}`);
    }
  }

  /**
   * Update chat title or description
   * @param chatId - Chat ID
   * @param userId - User ID (for authorization)
   * @param updates - Fields to update
   * @returns Updated chat
   */
  async updateChat(
    chatId: string,
    userId: number,
    updates: { title?: string; description?: string }
  ): Promise<ChatResponse | null> {
    try {
      const chat = await Chat.findOne({
        where: {
          id: chatId,
          userId,
          status: "active",
        },
      });

      if (!chat) {
        return null;
      }

      await chat.update(updates);

      return {
        id: chat.id,
        title: chat.title,
        description: chat.description,
        userId: chat.userId,
        status: chat.status,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        metadata: chat.metadata,
      };
    } catch (error: any) {
      console.error("Error updating chat:", error);
      throw new Error(`Failed to update chat: ${error.message}`);
    }
  }

  /**
   * Delete a chat and all its messages
   * @param chatId - Chat ID
   * @param userId - User ID (for authorization)
   * @returns Success status
   */
  async deleteChat(chatId: string, userId: number): Promise<boolean> {
    try {
      const chat = await Chat.findOne({
        where: {
          id: chatId,
          userId,
          status: "active",
        },
      });

      if (!chat) {
        return false;
      }

      // Delete all messages first
      await ChatMessage.destroy({
        where: { chatId },
      });

      // Mark chat as deleted
      await chat.update({ status: "deleted" });

      return true;
    } catch (error: any) {
      console.error("Error deleting chat:", error);
      throw new Error(`Failed to delete chat: ${error.message}`);
    }
  }

  /**
   * Get chat statistics for a user
   * @param userId - User ID
   * @returns Chat statistics
   */
  async getChatStats(userId: number): Promise<{
    totalChats: number;
    totalMessages: number;
    totalTokensUsed: number;
    averageMessagesPerChat: number;
  }> {
    try {
      const totalChats = await Chat.count({
        where: { userId, status: "active" },
      });

      const totalMessages = await ChatMessage.count({
        include: [
          {
            model: Chat,
            as: "chat",
            where: { userId, status: "active" },
            attributes: [],
          },
        ],
      });

      // Get total tokens used from chat metadata
      const chats = await Chat.findAll({
        where: { userId, status: "active" },
        attributes: ["metadata"],
      });

      const totalTokensUsed = chats.reduce((total, chat) => {
        return total + (chat.metadata?.totalTokensUsed || 0);
      }, 0);

      const averageMessagesPerChat =
        totalChats > 0
          ? Math.round((totalMessages / totalChats) * 100) / 100
          : 0;

      return {
        totalChats,
        totalMessages,
        totalTokensUsed,
        averageMessagesPerChat,
      };
    } catch (error: any) {
      console.error("Error getting chat stats:", error);
      throw new Error(`Failed to get chat stats: ${error.message}`);
    }
  }
}
