/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SlashCommand,
  CommandContext,
  MessageActionReturn,
  CommandKind,
} from './types.js';
import { AuthType } from '@vybestack/llxprt-code-core';
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';

export const keyfileCommand: SlashCommand = {
  name: 'keyfile',
  description: 'manage API key file for the current provider',
  kind: CommandKind.BUILT_IN,
  action: async (
    context: CommandContext,
    args: string,
  ): Promise<MessageActionReturn> => {
    const config = context.services.config;
    if (!config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'No configuration available',
      };
    }

    const providerManager = config.getProviderManager();
    if (!providerManager) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'No provider manager available',
      };
    }

    const filePath = args?.trim();

    try {
      const activeProvider = providerManager.getActiveProvider();
      const providerName = activeProvider.name;

      // If no path provided, check for existing keyfile
      if (!filePath || filePath === '') {
        // First check if a keyfile is already configured in ephemeral settings
        const currentKeyfile = config.getEphemeralSetting('auth-keyfile') as
          | string
          | undefined;
        if (currentKeyfile && typeof currentKeyfile === 'string') {
          return {
            type: 'message',
            messageType: 'info',
            content: `Current keyfile for provider '${providerName}': ${currentKeyfile}\nTo remove: /keyfile none\nTo change: /keyfile <new_path>`,
          };
        }

        // If no configured keyfile, check common keyfile locations
        const keyfilePaths = [
          path.join(homedir(), `.${providerName}_key`),
          path.join(homedir(), `.${providerName}-key`),
          path.join(homedir(), `.${providerName}_api_key`),
        ];

        // For specific providers, check their known keyfile locations
        if (providerName === 'openai') {
          keyfilePaths.unshift(path.join(homedir(), '.openai_key'));
        } else if (providerName === 'anthropic') {
          keyfilePaths.unshift(path.join(homedir(), '.anthropic_key'));
        }

        let foundKeyfile: string | null = null;
        for (const keyfilePath of keyfilePaths) {
          try {
            await fs.access(keyfilePath);
            foundKeyfile = keyfilePath;
            break;
          } catch {
            // File doesn't exist, continue checking
          }
        }

        if (foundKeyfile) {
          return {
            type: 'message',
            messageType: 'info',
            content: `Found keyfile for provider '${providerName}': ${foundKeyfile}\nTo use: /keyfile ${foundKeyfile}\nTo set different: /keyfile <new_path>`,
          };
        } else {
          return {
            type: 'message',
            messageType: 'info',
            content: `No keyfile configured or found for provider '${providerName}'\nTo set: /keyfile <path>`,
          };
        }
      }

      // Handle removal
      if (filePath === 'none') {
        // Clear authentication using the provider's method (which now stores in SettingsService)
        if (activeProvider.setApiKey) {
          activeProvider.setApiKey('');
        }

        // Also save clearing action to ephemeral settings so it's properly saved in profiles
        config.setEphemeralSetting('auth-key', undefined);
        // Clear any keyfile when explicitly clearing a key
        config.setEphemeralSetting('auth-keyfile', undefined);

        // If this is the Gemini provider, we might need to switch auth mode
        const requiresAuthRefresh = providerName === 'gemini';
        if (requiresAuthRefresh) {
          await config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
        }

        const isPaidMode = activeProvider.isPaidMode?.() ?? true;
        const paymentMessage =
          !isPaidMode && providerName === 'gemini'
            ? '\n[OK] You are now in FREE MODE - using OAuth authentication'
            : '';

        return {
          type: 'message',
          messageType: 'info',
          content: `Keyfile cleared for provider '${providerName}'${paymentMessage}`,
        };
      }

      // Verify keyfile exists and read the key
      try {
        const resolvedPath = filePath.replace(/^~/, homedir());

        // Check if file exists
        await fs.access(resolvedPath);

        // Verify the file is not empty
        const apiKey = (await fs.readFile(resolvedPath, 'utf-8')).trim();
        if (!apiKey) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'The specified file is empty',
          };
        }

        // Set the API key using the provider's method (which now stores in SettingsService)
        if (activeProvider.setApiKey) {
          activeProvider.setApiKey(apiKey);

          // Store the keyfile PATH in ephemeral settings so it's saved in profiles
          config.setEphemeralSetting('auth-keyfile', filePath);
          // Remove any stored auth-key since we're using keyfile
          config.setEphemeralSetting('auth-key', undefined);

          // If this is the Gemini provider, we need to refresh auth to use API key mode
          const requiresAuthRefresh = providerName === 'gemini';
          if (requiresAuthRefresh) {
            await config.refreshAuth(AuthType.USE_GEMINI);
          }

          // Check if we're now in paid mode
          const isPaidMode = activeProvider.isPaidMode?.() ?? true;
          const paymentWarning = isPaidMode
            ? '\nWARNING: You are now in PAID MODE - API usage will be charged to your account'
            : '';

          // Trigger payment mode check if available
          const extendedContext = context as CommandContext & {
            checkPaymentModeChange?: () => void;
          };
          if (extendedContext.checkPaymentModeChange) {
            setTimeout(extendedContext.checkPaymentModeChange, 100);
          }

          return {
            type: 'message',
            messageType: 'info',
            content: `API key loaded from ${filePath} for provider '${providerName}'${paymentWarning}`,
          };
        } else {
          return {
            type: 'message',
            messageType: 'error',
            content: `Provider '${providerName}' does not support API key updates`,
          };
        }
      } catch (error) {
        return {
          type: 'message',
          messageType: 'error',
          content: `Failed to manage keyfile: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Failed to access provider: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
