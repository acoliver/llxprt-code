import { Content } from '@google/genai';
import { ITool } from '../ITool.js';

export interface IChatGenerateParams {
  messages: Content[];
  tools?: ITool[];
  stream?: boolean;
  conversationId?: string;
  parentId?: string;
  tool_choice?: string | object;
  stateful?: boolean;
}
