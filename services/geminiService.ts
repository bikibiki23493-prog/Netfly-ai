import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ChatConfig, Message, Role, Attachment, ModelType } from '../types';

// Initialize the client with the provided API Key
const ai = new GoogleGenAI({ apiKey: 'AIzaSyCbmGFeNL05LSLur9LhlVBXIBnv576Up3A' });

export const createChat = (config: ChatConfig): Chat => {
  const modelId = config.model;
  
  // Prepare configuration
  const generationConfig: any = {};
  const tools: any[] = [];
  
  if (config.enableThinking && config.thinkingBudget > 0) {
    generationConfig.thinkingConfig = {
      thinkingBudget: config.thinkingBudget
    };
  }

  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: "You are a helpful, intelligent, and precise AI assistant called Netfly Ai. Respond using Markdown formatting. If the user asks for code, provide it in code blocks.",
      tools: tools.length > 0 ? tools : undefined,
      ...generationConfig
    },
  });
};

/**
 * Sends a message to the model (handling both text and images) and yields streaming chunks.
 */
export async function* sendMessageStream(
  chat: Chat, 
  text: string, 
  attachments: Attachment[] = []
): AsyncGenerator<string, void, unknown> {
  
  try {
    let messageContent: any;

    if (attachments.length > 0) {
        // Construct multipart content
        const parts = [];
        
        // Add images first
        for (const att of attachments) {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
        }
        
        // Add text prompt
        if (text) {
            parts.push({ text });
        }
        
        messageContent = { parts };
    } else {
        // Simple text message
        messageContent = { parts: [{ text }] };
    }

    // Use sendMessageStream. 
    const responseStream = await chat.sendMessageStream({ 
        message: attachments.length > 0 ? messageContent.parts : text 
    });

    let groundingSources: string[] = [];

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      
      // Check for grounding metadata (Search sources)
      const groundingMetadata = c.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
         groundingMetadata.groundingChunks.forEach((chunk: any) => {
             if (chunk.web?.uri) {
                 groundingSources.push(`[${chunk.web.title || 'Source'}](${chunk.web.uri})`);
             }
         });
      }

      if (c.text) {
        yield c.text;
      }
    }

    // Append sources if any found during the stream
    if (groundingSources.length > 0) {
        yield `\n\n**Sources:**\n${groundingSources.map(s => `- ${s}`).join('\n')}`;
    }

  } catch (error) {
    console.error("Error in sendMessageStream:", error);
    throw error;
  }
}

/**
 * Helper to convert File to base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};