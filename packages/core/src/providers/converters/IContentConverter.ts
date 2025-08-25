/**
 * @plan PLAN-20250113-SIMPLIFICATION.P03
 * @requirement REQ-002.1
 * @pseudocode lines 01-04
 */
import { Content } from '@google/genai';

export interface IContentConverter {
  toProviderFormat(contents: Content[]): unknown;
  fromProviderFormat(response: unknown): Content;
}
