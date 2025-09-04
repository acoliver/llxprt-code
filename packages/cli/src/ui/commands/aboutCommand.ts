/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getCliVersion } from '../../utils/version.js';
import type { CommandContext, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import process from 'node:process';
import { MessageType, type HistoryItemAbout } from '../types.js';
import { IdeClient } from '@vybestack/llxprt-code-core';

export const aboutCommand: SlashCommand = {
  name: 'about',
  description: 'show version info',
  kind: CommandKind.BUILT_IN,
  action: async (context) => {
    const osVersion = process.platform;
    let sandboxEnv = 'no sandbox';
    if (process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec') {
      sandboxEnv = process.env.SANDBOX;
    } else if (process.env.SANDBOX === 'sandbox-exec') {
      sandboxEnv = `sandbox-exec (${
        process.env.SEATBELT_PROFILE || 'unknown'
      })`;
    }
    // Determine the currently selected model. Prefer the active provider's
    // model as the source of truth because it is guaranteed to be up-to-date
    // when users switch models via the /model or /provider commands.
    let modelVersion = 'Unknown';
    try {
      // Dynamically import to avoid a hard dependency for tests that mock the
      // provider manager.
      const { getProviderManager } = await import(
        '../../providers/providerManagerInstance.js'
      );
      const providerManager = getProviderManager();
      const activeProvider = providerManager.getActiveProvider();
      if (activeProvider) {
        const providerName = providerManager.getActiveProviderName();
        const currentModel = activeProvider.getCurrentModel
          ? activeProvider.getCurrentModel()
          : context.services.config?.getModel() || 'Unknown';
        modelVersion = providerName
          ? `${providerName}:${currentModel}`
          : currentModel;
      }
    } catch {
      // Fallback to config if the provider manager cannot be resolved (e.g. in
      // unit tests).
      modelVersion = context.services.config?.getModel() || 'Unknown';
    }

    const cliVersion = await getCliVersion();
    const selectedAuthType =
      context.services.settings.merged.security?.auth?.selectedType || '';
    const gcpProject = process.env['GOOGLE_CLOUD_PROJECT'] || '';
    const ideClient = await getIdeClientName(context);

    // Determine keyfile path and key status for the active provider (if any)
    let keyfilePath = '';
    const keyStatus = '';
    try {
      const { getProviderManager } = await import(
        '../../providers/providerManagerInstance.js'
      );
      const providerManager = getProviderManager();
      const providerName = providerManager.getActiveProviderName();
      if (providerName) {
        keyfilePath =
          context.services.settings.getProviderKeyfile?.(providerName) || '';
        // We don't check for API keys anymore - they're only in profiles
      }
    } catch {
      // Ignore errors and leave defaults
    }

    const aboutItem: Omit<HistoryItemAbout, 'id'> = {
      type: MessageType.ABOUT,
      cliVersion,
      osVersion,
      sandboxEnv,
      modelVersion,
      selectedAuthType,
      gcpProject,
      keyfile: keyfilePath,
      key: keyStatus,
      ideClient,
    };

    context.ui.addItem(aboutItem, Date.now());
  },
};

async function getIdeClientName(context: CommandContext) {
  if (!context.services.config?.getIdeMode()) {
    return '';
  }
  const ideClient = await IdeClient.getInstance();
  return ideClient?.getDetectedIdeDisplayName() ?? '';
}
