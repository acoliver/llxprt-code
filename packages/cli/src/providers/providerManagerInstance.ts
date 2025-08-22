/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Config,
  ProviderManager,
  OpenAIProvider,
  AnthropicProvider,
  GeminiProvider,
  sanitizeForByteString,
  needsSanitization,
} from '@vybestack/llxprt-code-core';
import { IFileSystem, NodeFileSystem } from './IFileSystem.js';
import { homedir } from 'os';
import { join } from 'path';
import {
  Settings,
  LoadedSettings,
  USER_SETTINGS_PATH,
} from '../config/settings.js';
import stripJsonComments from 'strip-json-comments';
import { OAuthManager } from '../auth/oauth-manager.js';
import { MultiProviderTokenStore } from '../auth/types.js';
import { GeminiOAuthProvider } from '../auth/gemini-oauth-provider.js';
import { QwenOAuthProvider } from '../auth/qwen-oauth-provider.js';
import { AnthropicOAuthProvider } from '../auth/anthropic-oauth-provider.js';

/**
 * Sanitizes API keys to remove problematic characters that cause ByteString errors.
 * This handles cases where API key files have encoding issues or contain
 * Unicode replacement characters (U+FFFD).
 */
function sanitizeApiKey(key: string): string {
  const sanitized = sanitizeForByteString(key);

  if (needsSanitization(key)) {
    console.warn(
      '[ProviderManager] API key contained non-ASCII or control characters that were removed. ' +
        'Please check your API key file encoding (should be UTF-8 without BOM).',
    );
  }

  return sanitized;
}

let providerManagerInstance: ProviderManager | null = null;
let fileSystemInstance: IFileSystem | null = null;
let oauthManagerInstance: OAuthManager | null = null;

/**
 * Set a custom file system implementation (mainly for testing).
 */
export function setFileSystem(fs: IFileSystem): void {
  fileSystemInstance = fs;
}

/**
 * Get the file system implementation to use.
 */
function getFileSystem(): IFileSystem {
  if (!fileSystemInstance) {
    fileSystemInstance = new NodeFileSystem();
  }
  return fileSystemInstance;
}

export function getProviderManager(
  config?: Config,
  allowBrowserEnvironment = false,
): ProviderManager {
  if (!providerManagerInstance) {
    providerManagerInstance = new ProviderManager();
    const fs = getFileSystem();

    // Load user settings
    let userSettings: Settings | undefined;
    try {
      if (fs.existsSync(USER_SETTINGS_PATH)) {
        const userContent = fs.readFileSync(USER_SETTINGS_PATH, 'utf-8');
        userSettings = JSON.parse(stripJsonComments(userContent)) as Settings;
      }
    } catch (_error) {
      // Failed to load user settings, that's OK
    }

    // Create OAuth manager for providers
    const tokenStore = new MultiProviderTokenStore();
    // Create LoadedSettings from user settings for OAuth manager
    const loadedSettings = userSettings
      ? new LoadedSettings(
          { path: '', settings: {} }, // system
          { path: USER_SETTINGS_PATH, settings: userSettings }, // user
          { path: '', settings: {} }, // workspace
          [], // errors
        )
      : undefined;

    const oauthManager = new OAuthManager(tokenStore, loadedSettings);
    oauthManagerInstance = oauthManager;

    // Register OAuth providers
    oauthManager.registerProvider(new GeminiOAuthProvider());
    oauthManager.registerProvider(new QwenOAuthProvider());
    oauthManager.registerProvider(new AnthropicOAuthProvider());

    // Set config BEFORE registering providers so logging wrapper works
    if (config) {
      providerManagerInstance.setConfig(config);
    }

    // Always register GeminiProvider with OAuth manager
    const geminiProvider = new GeminiProvider(
      undefined,
      undefined,
      config,
      oauthManager,
    );

    if (config) {
      geminiProvider.setConfig(config);
    }
    providerManagerInstance.registerProvider(geminiProvider);

    // Configure Gemini auth - check for keyfile only
    try {
      const keyfilePath = join(homedir(), '.google_key');
      if (fs.existsSync(keyfilePath)) {
        const geminiApiKey = fs.readFileSync(keyfilePath, 'utf-8').trim();
        if (geminiApiKey) {
          geminiProvider.setApiKey(sanitizeApiKey(geminiApiKey));
        }
      }
    } catch (_error) {
      // No Google keyfile available, that's OK - will use OAuth if available
    }

    // Always register OpenAI provider
    // Priority: Environment variable > keyfile (skip keyfile in test)
    let openaiApiKey: string | undefined;

    if (process.env.OPENAI_API_KEY) {
      openaiApiKey = sanitizeApiKey(process.env.OPENAI_API_KEY);
    }

    if (!openaiApiKey) {
      try {
        const apiKeyPath = join(homedir(), '.openai_key');
        if (fs.existsSync(apiKeyPath)) {
          const rawKey = fs.readFileSync(apiKeyPath, 'utf-8').trim();
          openaiApiKey = sanitizeApiKey(rawKey);
        }
      } catch (_error) {
        // No OpenAI keyfile available, that's OK
      }
    }

    const openaiBaseUrl = process.env.OPENAI_BASE_URL;
    if (process.env.DEBUG || process.env.VERBOSE) {
      console.log('[ProviderManager] Initializing OpenAI provider with:', {
        hasApiKey: !!openaiApiKey,
        baseUrl: openaiBaseUrl || 'default',
      });
    }
    
    // Note: Local AI server support is now handled automatically via configureLocalAIClientOptions
    // in the OpenAI provider - no global dispatcher setup needed
    // Create provider config from user settings
    const openaiProviderConfig = {
      enableTextToolCallParsing: userSettings?.enableTextToolCallParsing,
      textToolCallModels: userSettings?.textToolCallModels,
      providerToolFormatOverrides: userSettings?.providerToolFormatOverrides,
      openaiResponsesEnabled: userSettings?.openaiResponsesEnabled,
      allowBrowserEnvironment,
      getEphemeralSettings: config
        ? () => config.getEphemeralSettings()
        : undefined,
    };
    const openaiProvider = new OpenAIProvider(
      openaiApiKey || undefined, // Pass undefined, not empty string, to allow OAuth fallback
      openaiBaseUrl,
      openaiProviderConfig,
      oauthManager,
    );
    providerManagerInstance.registerProvider(openaiProvider);

    // Register qwen as an alias to OpenAI provider with OAuth
    // When user selects "--provider qwen", we create a separate OpenAI instance for Qwen
    const qwenProvider = new OpenAIProvider(
      undefined, // No API key - force OAuth
      undefined, // No base URL - will be set from OAuth token's resource_url
      openaiProviderConfig,
      oauthManager,
    );
    // Override the name to 'qwen' so it can be selected
    Object.defineProperty(qwenProvider, 'name', {
      value: 'qwen',
      writable: false,
      enumerable: true,
      configurable: true,
    });
    providerManagerInstance.registerProvider(qwenProvider);

    // Always register Anthropic provider
    // Priority: Environment variable > keyfile (skip keyfile in test)
    let anthropicApiKey: string | undefined;

    if (process.env.ANTHROPIC_API_KEY) {
      anthropicApiKey = sanitizeApiKey(process.env.ANTHROPIC_API_KEY);
    }

    if (!anthropicApiKey) {
      try {
        const apiKeyPath = join(homedir(), '.anthropic_key');
        if (fs.existsSync(apiKeyPath)) {
          const rawKey = fs.readFileSync(apiKeyPath, 'utf-8').trim();
          anthropicApiKey = sanitizeApiKey(rawKey);
        }
      } catch (_error) {
        // No Anthropic keyfile available, that's OK
      }
    }

    const anthropicBaseUrl = process.env.ANTHROPIC_BASE_URL;
    // Create provider config from user settings
    const anthropicProviderConfig = {
      allowBrowserEnvironment,
    };
    const anthropicProvider = new AnthropicProvider(
      anthropicApiKey || undefined, // Pass undefined instead of empty string to allow OAuth fallback
      anthropicBaseUrl,
      anthropicProviderConfig,
      oauthManager,
    );
    providerManagerInstance.registerProvider(anthropicProvider);

    // Set default provider to gemini
    providerManagerInstance.setActiveProvider('gemini');
  }

  return providerManagerInstance;
}

export function resetProviderManager(): void {
  providerManagerInstance = null;
  fileSystemInstance = null;
  oauthManagerInstance = null;
}

export function getOAuthManager(): OAuthManager | null {
  return oauthManagerInstance;
}

export { getProviderManager as providerManager };
