/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { homedir, platform } from 'os';
import * as dotenv from 'dotenv';
import {
  LLXPRT_CONFIG_DIR as LLXPRT_DIR,
  getErrorMessage,
  Storage,
  FatalConfigError,
} from '@vybestack/llxprt-code-core';
import stripJsonComments from 'strip-json-comments';
import { DefaultLight } from '../ui/themes/default-light.js';
import { DefaultDark } from '../ui/themes/default.js';
import { isWorkspaceTrusted } from './trustedFolders.js';
import {
  type Settings,
  type MemoryImportFormat,
  SETTINGS_SCHEMA,
  type MergeStrategy,
  type SettingsSchema,
  type SettingDefinition,
} from './settingsSchema.js';
import { customDeepMerge } from '../utils/deepMerge.js';

function getMergeStrategyForPath(path: string[]): MergeStrategy | undefined {
  let current: SettingDefinition | undefined = undefined;
  let currentSchema: SettingsSchema | undefined = SETTINGS_SCHEMA;

  for (const key of path) {
    if (!currentSchema || !currentSchema[key]) {
      return undefined;
    }
    current = currentSchema[key];
    currentSchema = current.properties;
  }

  return current?.mergeStrategy;
}

export type { Settings, MemoryImportFormat };

export const SETTINGS_DIRECTORY_NAME = '.llxprt';

export const USER_SETTINGS_PATH = Storage.getGlobalSettingsPath();
export const USER_SETTINGS_DIR = path.dirname(USER_SETTINGS_PATH);
export const DEFAULT_EXCLUDED_ENV_VARS = ['DEBUG', 'DEBUG_MODE'];

// const _MIGRATE_V2_OVERWRITE = false; // Unused for now

// As defined in spec.md
const MIGRATION_MAP: Record<string, string> = {
  accessibility: 'ui.accessibility',
  allowedTools: 'tools.allowed',
  allowMCPServers: 'mcp.allowed',
  autoAccept: 'tools.autoAccept',
  autoConfigureMaxOldSpaceSize: 'advanced.autoConfigureMemory',
  bugCommand: 'advanced.bugCommand',
  chatCompression: 'model.chatCompression',
  checkpointing: 'general.checkpointing',
  coreTools: 'tools.core',
  contextFileName: 'context.fileName',
  customThemes: 'ui.customThemes',
  debugKeystrokeLogging: 'general.debugKeystrokeLogging',
  disableAutoUpdate: 'general.disableAutoUpdate',
  disableUpdateNag: 'general.disableUpdateNag',
  dnsResolutionOrder: 'advanced.dnsResolutionOrder',
  enablePromptCompletion: 'general.enablePromptCompletion',
  enforcedAuthType: 'security.auth.enforcedType',
  excludeTools: 'tools.exclude',
  excludeMCPServers: 'mcp.excluded',
  excludedProjectEnvVars: 'advanced.excludedEnvVars',
  extensionManagement: 'advanced.extensionManagement',
  extensions: 'extensions',
  fileFiltering: 'context.fileFiltering',
  folderTrustFeature: 'security.folderTrust.featureEnabled',
  folderTrust: 'security.folderTrust.enabled',
  hasSeenIdeIntegrationNudge: 'ide.hasSeenNudge',
  hideWindowTitle: 'ui.hideWindowTitle',
  hideTips: 'ui.hideTips',
  hideBanner: 'ui.hideBanner',
  hideFooter: 'ui.hideFooter',
  hideCWD: 'ui.footer.hideCWD',
  hideSandboxStatus: 'ui.footer.hideSandboxStatus',
  hideModelInfo: 'ui.footer.hideModelInfo',
  hideContextSummary: 'ui.hideContextSummary',
  showMemoryUsage: 'ui.showMemoryUsage',
  showLineNumbers: 'ui.showLineNumbers',
  showCitations: 'ui.showCitations',
  ideMode: 'ide.enabled',
  includeDirectories: 'context.includeDirectories',
  loadMemoryFromIncludeDirectories: 'context.loadFromIncludeDirectories',
  maxSessionTurns: 'model.maxSessionTurns',
  mcpServers: 'mcpServers',
  mcpServerCommand: 'mcp.serverCommand',
  memoryImportFormat: 'context.importFormat',
  memoryDiscoveryMaxDirs: 'context.discoveryMaxDirs',
  model: 'model.name',
  preferredEditor: 'general.preferredEditor',
  sandbox: 'tools.sandbox',
  selectedAuthType: 'security.auth.selectedType',
  shouldUseNodePtyShell: 'tools.usePty',
  skipNextSpeakerCheck: 'model.skipNextSpeakerCheck',
  summarizeToolOutput: 'model.summarizeToolOutput',
  telemetry: 'telemetry',
  theme: 'ui.theme',
  toolDiscoveryCommand: 'tools.discoveryCommand',
  toolCallCommand: 'tools.callCommand',
  usageStatisticsEnabled: 'privacy.usageStatisticsEnabled',
  useExternalAuth: 'security.auth.useExternal',
  useRipgrep: 'tools.useRipgrep',
  vimMode: 'general.vimMode',
};

export function getSystemSettingsPath(): string {
  if (process.env.LLXPRT_CODE_SYSTEM_SETTINGS_PATH) {
    return process.env.LLXPRT_CODE_SYSTEM_SETTINGS_PATH;
  }
  if (platform() === 'darwin') {
    return '/Library/Application Support/LLxprt-Code/settings.json';
  } else if (platform() === 'win32') {
    return 'C:\\ProgramData\\llxprt-code\\settings.json';
  } else {
    return '/etc/llxprt-code/settings.json';
  }
}

export function getSystemDefaultsPath(): string {
  if (process.env['LLXPRT_CODE_SYSTEM_DEFAULTS_PATH']) {
    return process.env['LLXPRT_CODE_SYSTEM_DEFAULTS_PATH'];
  }
  return path.join(
    path.dirname(getSystemSettingsPath()),
    'system-defaults.json',
  );
}

export type { DnsResolutionOrder } from './settingsSchema.js';

export enum SettingScope {
  User = 'User',
  Workspace = 'Workspace',
  System = 'System',
  SystemDefaults = 'SystemDefaults',
}

export interface CheckpointingSettings {
  enabled?: boolean;
}

export interface SummarizeToolOutputSettings {
  tokenBudget?: number;
}

export interface AccessibilitySettings {
  disableLoadingPhrases?: boolean;
  screenReader?: boolean;
}

export interface SettingsError {
  message: string;
  path: string;
}

export interface SettingsFile {
  settings: Settings;
  path: string;
}

function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  let current: Record<string, unknown> = obj;
  for (const key of keys) {
    if (current[key] === undefined) {
      current[key] = {};
    }
    const next = current[key];
    if (typeof next === 'object' && next !== null) {
      current = next as Record<string, unknown>;
    } else {
      // This path is invalid, so we stop.
      return;
    }
  }
  current[lastKey] = value;
}

export function needsMigration(settings: Record<string, unknown>): boolean {
  // A file needs migration if it contains any top-level key that is moved to a
  // nested location in V2.
  const hasV1Keys = Object.entries(MIGRATION_MAP).some(([v1Key, v2Path]) => {
    if (v1Key === v2Path || !(v1Key in settings)) {
      return false;
    }
    // If a key exists that is both a V1 key and a V2 container (like 'model'),
    // we need to check the type. If it's an object, it's a V2 container and not
    // a V1 key that needs migration.
    if (
      KNOWN_V2_CONTAINERS.has(v1Key) &&
      typeof settings[v1Key] === 'object' &&
      settings[v1Key] !== null
    ) {
      return false;
    }
    return true;
  });

  return hasV1Keys;
}

function _migrateSettingsToV2(
  flatSettings: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!needsMigration(flatSettings)) {
    return null;
  }

  const v2Settings: Record<string, unknown> = {};
  const flatKeys = new Set(Object.keys(flatSettings));

  for (const [oldKey, newPath] of Object.entries(MIGRATION_MAP)) {
    if (flatKeys.has(oldKey)) {
      setNestedProperty(v2Settings, newPath, flatSettings[oldKey]);
      flatKeys.delete(oldKey);
    }
  }

  // Preserve mcpServers at the top level
  if (flatSettings['mcpServers']) {
    v2Settings['mcpServers'] = flatSettings['mcpServers'];
    flatKeys.delete('mcpServers');
  }

  // Carry over any unrecognized keys
  for (const remainingKey of flatKeys) {
    v2Settings[remainingKey] = flatSettings[remainingKey];
  }

  return v2Settings;
}

function getNestedProperty(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

const REVERSE_MIGRATION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MIGRATION_MAP).map(([key, value]) => [value, key]),
);

// Dynamically determine the top-level keys from the V2 settings structure.
const KNOWN_V2_CONTAINERS = new Set(
  Object.values(MIGRATION_MAP).map((path) => path.split('.')[0]),
);

export function migrateSettingsToV1(
  v2Settings: Record<string, unknown>,
): Record<string, unknown> {
  const v1Settings: Record<string, unknown> = {};
  const v2Keys = new Set(Object.keys(v2Settings));

  for (const [newPath, oldKey] of Object.entries(REVERSE_MIGRATION_MAP)) {
    const value = getNestedProperty(v2Settings, newPath);
    if (value !== undefined) {
      v1Settings[oldKey] = value;
      v2Keys.delete(newPath.split('.')[0]);
    }
  }

  // Preserve mcpServers at the top level
  if (v2Settings['mcpServers']) {
    v1Settings['mcpServers'] = v2Settings['mcpServers'];
    v2Keys.delete('mcpServers');
  }

  // Carry over any unrecognized keys
  for (const remainingKey of v2Keys) {
    const value = v2Settings[remainingKey];
    if (value === undefined) {
      continue;
    }

    // Don't carry over empty objects that were just containers for migrated settings.
    if (
      KNOWN_V2_CONTAINERS.has(remainingKey) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }

    v1Settings[remainingKey] = value;
  }

  return v1Settings;
}

function mergeSettings(
  system: Settings,
  systemDefaults: Settings,
  user: Settings,
  workspace: Settings,
  isTrusted: boolean,
): Settings {
  const safeWorkspace = isTrusted ? workspace : ({} as Settings);

  // folderTrust is not supported at workspace level.
  const { security, ...restOfWorkspace } = safeWorkspace;
  const safeWorkspaceWithoutFolderTrust = security
    ? {
        ...restOfWorkspace,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        security: (({ folderTrust, ...rest }) => rest)(security),
      }
    : {
        ...restOfWorkspace,
      };

  // Settings are merged with the following precedence (last one wins for
  // single values):
  // 1. System Defaults
  // 2. User Settings
  // 3. Workspace Settings
  // 4. System Settings (as overrides)
  return customDeepMerge(
    getMergeStrategyForPath,
    {}, // Start with an empty object
    systemDefaults,
    user,
    safeWorkspaceWithoutFolderTrust,
    system,
  ) as Settings;
}

export class LoadedSettings {
  constructor(
    system: SettingsFile,
    systemDefaults: SettingsFile,
    user: SettingsFile,
    workspace: SettingsFile,
    errors: SettingsError[],
    isTrusted: boolean,
  ) {
    this.system = system;
    this.systemDefaults = systemDefaults;
    this.user = user;
    this.workspace = workspace;
    this.errors = errors;
    this.isTrusted = isTrusted;
    this._merged = this.computeMergedSettings();
  }

  readonly system: SettingsFile;
  readonly systemDefaults: SettingsFile;
  readonly user: SettingsFile;
  readonly workspace: SettingsFile;
  readonly errors: SettingsError[];
  readonly isTrusted: boolean;

  private _merged: Settings;

  get merged(): Settings {
    return this._merged;
  }

  private computeMergedSettings(): Settings {
    return mergeSettings(
      this.system.settings,
      this.systemDefaults.settings,
      this.user.settings,
      this.workspace.settings,
      this.isTrusted,
    );
  }

  forScope(scope: SettingScope): SettingsFile {
    switch (scope) {
      case SettingScope.User:
        return this.user;
      case SettingScope.Workspace:
        return this.workspace;
      case SettingScope.System:
        return this.system;
      case SettingScope.SystemDefaults:
        return this.systemDefaults;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
  }

  setValue<K extends keyof Settings>(
    scope: SettingScope,
    key: K,
    value: Settings[K],
  ): void {
    const settingsFile = this.forScope(scope);
    settingsFile.settings[key] = value;
    this._merged = this.computeMergedSettings();
    saveSettings(settingsFile);
  }

  // Provider keyfile methods for llxprt multi-provider support
  getProviderKeyfile(providerName: string): string | undefined {
    const keyfiles = this.merged.providerKeyfiles || {};
    return keyfiles[providerName];
  }

  setProviderKeyfile(providerName: string, keyfilePath: string): void {
    const keyfiles = this.merged.providerKeyfiles || {};
    keyfiles[providerName] = keyfilePath;
    this.setValue(SettingScope.User, 'providerKeyfiles', keyfiles);
  }

  removeProviderKeyfile(providerName: string): void {
    const keyfiles = this.merged.providerKeyfiles || {};
    delete keyfiles[providerName];
    this.setValue(SettingScope.User, 'providerKeyfiles', keyfiles);
  }

  // OAuth enablement methods
  getOAuthEnabledProviders(): Record<string, boolean> {
    return this.merged.oauthEnabledProviders || {};
  }

  setOAuthEnabledProvider(providerName: string, enabled: boolean): void {
    const oauthEnabledProviders = this.getOAuthEnabledProviders();
    oauthEnabledProviders[providerName] = enabled;
    this.setValue(
      SettingScope.User,
      'oauthEnabledProviders',
      oauthEnabledProviders,
    );
  }

  isOAuthEnabledForProvider(providerName: string): boolean {
    const oauthEnabledProviders = this.getOAuthEnabledProviders();
    return oauthEnabledProviders[providerName] ?? false;
  }
}

function resolveEnvVarsInString(value: string): string {
  const envVarRegex = /\$(?:(\w+)|{([^}]+)})/g; // Find $VAR_NAME or ${VAR_NAME}
  return value.replace(envVarRegex, (match, varName1, varName2) => {
    const varName = varName1 || varName2;
    if (process && process.env && typeof process.env[varName] === 'string') {
      return process.env[varName]!;
    }
    return match;
  });
}

function resolveEnvVarsInObject<T>(obj: T): T {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj === 'boolean' ||
    typeof obj === 'number'
  ) {
    return obj;
  }

  if (typeof obj === 'string') {
    return resolveEnvVarsInString(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveEnvVarsInObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj = { ...obj } as T;
    for (const key in newObj) {
      if (Object.prototype.hasOwnProperty.call(newObj, key)) {
        newObj[key] = resolveEnvVarsInObject(newObj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

function findEnvFile(startDir: string): string | null {
  let currentDir = path.resolve(startDir);
  while (true) {
    // prefer gemini-specific .env under LLXPRT_DIR
    const geminiEnvPath = path.join(currentDir, LLXPRT_DIR, '.env');
    if (fs.existsSync(geminiEnvPath)) {
      return geminiEnvPath;
    }
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir || !parentDir) {
      // check .env under home as fallback, again preferring gemini-specific .env
      const homeGeminiEnvPath = path.join(homedir(), LLXPRT_DIR, '.env');
      if (fs.existsSync(homeGeminiEnvPath)) {
        return homeGeminiEnvPath;
      }
      const homeEnvPath = path.join(homedir(), '.env');
      if (fs.existsSync(homeEnvPath)) {
        return homeEnvPath;
      }
      return null;
    }
    currentDir = parentDir;
  }
}

export function setUpCloudShellEnvironment(envFilePath: string | null): void {
  // Special handling for GOOGLE_CLOUD_PROJECT in Cloud Shell:
  // Because GOOGLE_CLOUD_PROJECT in Cloud Shell tracks the project
  // set by the user using "gcloud config set project" we do not want to
  // use its value. So, unless the user overrides GOOGLE_CLOUD_PROJECT in
  // one of the .env files, we set the Cloud Shell-specific default here.
  if (envFilePath && fs.existsSync(envFilePath)) {
    const envFileContent = fs.readFileSync(envFilePath);
    const parsedEnv = dotenv.parse(envFileContent);
    if (parsedEnv.GOOGLE_CLOUD_PROJECT) {
      // .env file takes precedence in Cloud Shell
      process.env.GOOGLE_CLOUD_PROJECT = parsedEnv.GOOGLE_CLOUD_PROJECT;
    } else {
      // If not in .env, set to default and override global
      process.env.GOOGLE_CLOUD_PROJECT = 'cloudshell-gca';
    }
  } else {
    // If no .env file, set to default and override global
    process.env.GOOGLE_CLOUD_PROJECT = 'cloudshell-gca';
  }
}

export function loadEnvironment(settings?: Settings): void {
  const envFilePath = findEnvFile(process.cwd());

  if (settings && !isWorkspaceTrusted(settings)) {
    return;
  }

  // Cloud Shell environment variable handling
  if (process.env.CLOUD_SHELL === 'true') {
    setUpCloudShellEnvironment(envFilePath);
  }

  // If no settings provided, try to load workspace settings for exclusions
  let resolvedSettings = settings;
  if (!resolvedSettings) {
    const workspaceSettingsPath = new Storage(
      process.cwd(),
    ).getWorkspaceSettingsPath();
    try {
      if (fs.existsSync(workspaceSettingsPath)) {
        const workspaceContent = fs.readFileSync(
          workspaceSettingsPath,
          'utf-8',
        );
        const parsedWorkspaceSettings = JSON.parse(
          stripJsonComments(workspaceContent),
        ) as Settings;
        resolvedSettings = resolveEnvVarsInObject(parsedWorkspaceSettings);
      }
    } catch (_e) {
      // Ignore errors loading workspace settings
    }
  }

  if (envFilePath) {
    // Manually parse and load environment variables to handle exclusions correctly.
    // This avoids modifying environment variables that were already set from the shell.
    try {
      const envFileContent = fs.readFileSync(envFilePath, 'utf-8');
      const parsedEnv = dotenv.parse(envFileContent);

      const excludedVars =
        resolvedSettings?.excludedProjectEnvVars || DEFAULT_EXCLUDED_ENV_VARS;
      const isProjectEnvFile = !envFilePath.includes(LLXPRT_DIR);

      for (const key in parsedEnv) {
        if (Object.hasOwn(parsedEnv, key)) {
          // If it's a project .env file, skip loading excluded variables.
          if (isProjectEnvFile && excludedVars.includes(key)) {
            continue;
          }

          // Load variable only if it's not already set in the environment.
          if (!Object.hasOwn(process.env, key)) {
            process.env[key] = parsedEnv[key];
          }
        }
      }
    } catch (_e) {
      // Errors are ignored to match the behavior of `dotenv.config({ quiet: true })`.
    }
  }
}

/**
 * Loads settings from user and workspace directories.
 * Project settings override user settings.
 */
export function loadSettings(workspaceDir: string): LoadedSettings {
  let systemSettings: Settings = {};
  let systemDefaultSettings: Settings = {};
  let userSettings: Settings = {};
  let workspaceSettings: Settings = {};
  const settingsErrors: SettingsError[] = [];
  const systemSettingsPath = getSystemSettingsPath();
  const systemDefaultsPath = getSystemDefaultsPath();

  // Resolve paths to their canonical representation to handle symlinks
  const resolvedWorkspaceDir = path.resolve(workspaceDir);
  const resolvedHomeDir = path.resolve(homedir());

  let realWorkspaceDir = resolvedWorkspaceDir;
  try {
    // fs.realpathSync gets the "true" path, resolving any symlinks
    realWorkspaceDir = fs.realpathSync(resolvedWorkspaceDir);
  } catch (_e) {
    // This is okay. The path might not exist yet, and that's a valid state.
  }

  // We expect homedir to always exist and be resolvable.
  const realHomeDir = fs.realpathSync(resolvedHomeDir);

  const workspaceSettingsPath = new Storage(
    workspaceDir,
  ).getWorkspaceSettingsPath();

  // Load system settings
  try {
    if (fs.existsSync(systemSettingsPath)) {
      const systemContent = fs.readFileSync(systemSettingsPath, 'utf-8');
      const rawSystemSettings = JSON.parse(stripJsonComments(systemContent)) as Record<string, unknown>;
      systemSettings = (needsMigration(rawSystemSettings) ? 
        _migrateSettingsToV2(rawSystemSettings) ?? rawSystemSettings : 
        rawSystemSettings) as Settings;
    }
  } catch (error: unknown) {
    settingsErrors.push({
      message: getErrorMessage(error),
      path: systemSettingsPath,
    });
  }

  // Load system defaults
  try {
    if (fs.existsSync(systemDefaultsPath)) {
      const systemDefaultsContent = fs.readFileSync(
        systemDefaultsPath,
        'utf-8',
      );
      const rawSystemDefaults = JSON.parse(
        stripJsonComments(systemDefaultsContent),
      ) as Record<string, unknown>;
      const migratedSystemDefaults = (needsMigration(rawSystemDefaults) ? 
        _migrateSettingsToV2(rawSystemDefaults) ?? rawSystemDefaults : 
        rawSystemDefaults) as Settings;
      systemDefaultSettings = resolveEnvVarsInObject(migratedSystemDefaults);
    }
  } catch (error: unknown) {
    settingsErrors.push({
      message: getErrorMessage(error),
      path: systemDefaultsPath,
    });
  }

  // Load user settings
  try {
    if (fs.existsSync(USER_SETTINGS_PATH)) {
      const userContent = fs.readFileSync(USER_SETTINGS_PATH, 'utf-8');
      const rawUserSettings = JSON.parse(stripJsonComments(userContent)) as Record<string, unknown>;
      userSettings = (needsMigration(rawUserSettings) ? 
        _migrateSettingsToV2(rawUserSettings) ?? rawUserSettings : 
        rawUserSettings) as Settings;
      // Support legacy theme names
      if (userSettings.theme && userSettings.theme === 'VS') {
        userSettings.theme = DefaultLight.name;
      } else if (userSettings.theme && userSettings.theme === 'VS2015') {
        userSettings.theme = DefaultDark.name;
      }
    }
  } catch (error: unknown) {
    settingsErrors.push({
      message: getErrorMessage(error),
      path: USER_SETTINGS_PATH,
    });
  }

  if (realWorkspaceDir !== realHomeDir) {
    // Load workspace settings
    try {
      if (fs.existsSync(workspaceSettingsPath)) {
        const projectContent = fs.readFileSync(workspaceSettingsPath, 'utf-8');
        const rawWorkspaceSettings = JSON.parse(
          stripJsonComments(projectContent),
        ) as Record<string, unknown>;
        workspaceSettings = (needsMigration(rawWorkspaceSettings) ? 
          _migrateSettingsToV2(rawWorkspaceSettings) ?? rawWorkspaceSettings : 
          rawWorkspaceSettings) as Settings;
        if (workspaceSettings.theme && workspaceSettings.theme === 'VS') {
          workspaceSettings.theme = DefaultLight.name;
        } else if (
          workspaceSettings.theme &&
          workspaceSettings.theme === 'VS2015'
        ) {
          workspaceSettings.theme = DefaultDark.name;
        }
      }
    } catch (error: unknown) {
      settingsErrors.push({
        message: getErrorMessage(error),
        path: workspaceSettingsPath,
      });
    }
  }

  // Support legacy theme names
  if (userSettings.ui?.theme === 'VS') {
    userSettings.ui.theme = DefaultLight.name;
  } else if (userSettings.ui?.theme === 'VS2015') {
    userSettings.ui.theme = DefaultDark.name;
  }
  if (workspaceSettings.ui?.theme === 'VS') {
    workspaceSettings.ui.theme = DefaultLight.name;
  } else if (workspaceSettings.ui?.theme === 'VS2015') {
    workspaceSettings.ui.theme = DefaultDark.name;
  }

  // For the initial trust check, we can only use user and system settings.
  const initialTrustCheckSettings = customDeepMerge(
    getMergeStrategyForPath,
    {},
    systemSettings,
    userSettings,
  );
  const isTrusted =
    isWorkspaceTrusted(initialTrustCheckSettings as Settings) ?? true;

  // Create a temporary merged settings object to pass to loadEnvironment.
  const tempMergedSettings = mergeSettings(
    systemSettings,
    systemDefaultSettings,
    userSettings,
    workspaceSettings,
    isTrusted,
  );

  // loadEnviroment depends on settings so we have to create a temp version of
  // the settings to avoid a cycle
  loadEnvironment(tempMergedSettings);

  // Now that the environment is loaded, resolve variables in the settings.
  systemSettings = resolveEnvVarsInObject(systemSettings);
  userSettings = resolveEnvVarsInObject(userSettings);
  workspaceSettings = resolveEnvVarsInObject(workspaceSettings);

  // Create LoadedSettings first
  const loadedSettings = new LoadedSettings(
    {
      path: systemSettingsPath,
      settings: systemSettings,
    },
    {
      path: systemDefaultsPath,
      settings: systemDefaultSettings,
    },
    {
      path: USER_SETTINGS_PATH,
      settings: userSettings,
    },
    {
      path: workspaceSettingsPath,
      settings: workspaceSettings,
    },
    settingsErrors,
    isTrusted,
  );

  // Validate chatCompression settings
  const chatCompression = loadedSettings.merged.chatCompression;
  const threshold = chatCompression?.contextPercentageThreshold;
  if (
    threshold != null &&
    (typeof threshold !== 'number' || threshold < 0 || threshold > 1)
  ) {
    console.warn(
      `Invalid value for chatCompression.contextPercentageThreshold: "${threshold}". Please use a value between 0 and 1. Using default compression settings.`,
    );
    delete loadedSettings.merged.chatCompression;
  }

  // Throw FatalConfigError if there were any parsing errors
  if (settingsErrors.length > 0) {
    const errorMessages = settingsErrors.map(error => `Error in ${error.path}: ${error.message}`).join('\n');
    throw new FatalConfigError(
      `Configuration file errors detected:\n${errorMessages}\nPlease fix the configuration file(s) and try again.`
    );
  }

  return loadedSettings;
}

export function saveSettings(settingsFile: SettingsFile): void {
  try {
    // Ensure the directory exists
    const dirPath = path.dirname(settingsFile.path);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(
      settingsFile.path,
      JSON.stringify(settingsFile.settings, null, 2),
      'utf-8',
    );
  } catch (error) {
    console.error('Error saving user settings file:', error);
  }
}
