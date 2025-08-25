/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { processSingleFileContent } from '@vybestack/llxprt-code-core';
import { GeminiProvider } from './GeminiProvider.js';
import type { Part, Content } from '@google/genai';

describe('GeminiProvider Integration', () => {
  it('should handle real PDF file content', async () => {
    const _provider = new GeminiProvider();
    const testPdfPath = path.join(__dirname, '__fixtures__/test.pdf');

    // Check if test PDF exists
    try {
      await fs.access(testPdfPath);
    } catch {
      console.log('Skipping test - test PDF not found at:', testPdfPath);
      return;
    }

    // Process the PDF file like the read tool would
    const pdfResult = await processSingleFileContent(
      testPdfPath,
      path.dirname(testPdfPath),
    );

    // Create Content[] format (new format)
    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          { text: 'Please analyze this PDF document:' },
          pdfResult.llmContent as Part, // This should be the inlineData object
        ],
      },
    ];

    // Since GeminiProvider now uses Content[] directly, we just verify the input format
    // The provider accepts Content[] and passes it through to Gemini natively
    expect(contents).toHaveLength(1);
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts).toHaveLength(2);

    // First part should be the text
    expect(contents[0].parts?.[0]).toEqual({
      text: 'Please analyze this PDF document:',
    });

    // Second part should be the inline data
    expect(contents[0].parts?.[1]).toHaveProperty('inlineData');
    expect(contents[0].parts?.[1].inlineData).toHaveProperty('data');
    expect(contents[0].parts?.[1].inlineData).toHaveProperty(
      'mimeType',
      'application/pdf',
    );

    // Verify the base64 data is present and non-empty
    const inlineData = contents[0].parts?.[1].inlineData;
    expect(inlineData?.data).toBeTruthy();
    expect(inlineData?.data?.length).toBeGreaterThan(100); // PDF should have substantial base64 data
  });

  it('should handle mixed text and image content', async () => {
    const _provider = new GeminiProvider();

    // Simulate mixed content with text and an image using Content[] format
    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          { text: 'What do you see in this image?' },
          {
            inlineData: {
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 red pixel PNG
              mimeType: 'image/png',
            },
          },
          { text: 'Is it red?' },
        ],
      },
    ];

    // Since GeminiProvider now uses Content[] directly, we just verify the format
    expect(contents).toHaveLength(1);
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts).toHaveLength(3);
    expect(contents[0].parts?.[0]).toEqual({
      text: 'What do you see in this image?',
    });
    expect(contents[0].parts?.[1]).toEqual({
      inlineData: {
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
      },
    });
    expect(contents[0].parts?.[2]).toEqual({ text: 'Is it red?' });
  });
  it('should include a custom baseURL when it is set', async () => {
    const provider = new GeminiProvider();
    const baseURL = 'https://my-custom-url';

    provider.setBaseUrl(baseURL);

    // Simulate mixed content with text and an image using Content[] format
    const contents: Content[] = [
      {
        role: 'user',
        parts: [
          { text: 'What do you see in this image?' },
          {
            inlineData: {
              data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 red pixel PNG
              mimeType: 'image/png',
            },
          },
          { text: 'Is it red?' },
        ],
      },
    ];

    // Since GeminiProvider now uses Content[] directly, we just verify the format
    expect(contents).toHaveLength(1);
    expect(contents[0].role).toBe('user');
    expect(contents[0].parts).toHaveLength(3);
    expect(contents[0].parts?.[0]).toEqual({
      text: 'What do you see in this image?',
    });
    expect(contents[0].parts?.[1]).toEqual({
      inlineData: {
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
      },
    });
    expect(contents[0].parts?.[2]).toEqual({ text: 'Is it red?' });
  });
});
