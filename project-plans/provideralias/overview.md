# Provider Alias System Overview

## Concept

Provider aliases allow users to create custom named configurations that map to existing provider implementations but with specific settings such as baseUrl, default model, and model parameters. This system enables easy switching between different service configurations without requiring separate provider implementations.

## Key Features

1. **Alias Creation**: Users can create aliases with custom names that map to base provider implementations
2. **Pre-configured Aliases**: The system ships with predefined aliases for services like Cerebras, Fireworks, etc.
3. **Seamless Integration**: Aliases appear in `/provider` command alongside concrete provider names
4. **Settings Application**: When an alias is selected, its associated settings are automatically applied

## Architecture

### Components

1. **Alias Configuration Files**
   - JSON format files defining alias properties
   - Stored in `~/.llxprt/provideraliases/` directory
   - Both user-created and pre-configured aliases

2. **ProviderManager Extension**
   - Discover and load alias configuration files
   - Maintain mapping of alias names to base providers and settings
   - Include aliases in provider listing

3. **Provider Command Integration**
   - Resolve alias names to base providers during switching
   - Apply alias-specific settings through SettingsService

### Data Structure

Each alias configuration file would contain:

```json
{
  "name": "cerebras",
  "baseProvider": "openai",
  "providerSettings": {
    "model": "llama3.1-70b",
    "baseUrl": "https://api.cerebras.ai/v1"
  },
  "ephemeralSettings": {
    "streaming": "disabled",
    "max-tokens": 2000
  },
  "modelParameters": {
    "temperature": 0.7,
    "top_p": 0.9,
    "frequency_penalty": 0.5
  }
}
```

## File Locations

### Pre-configured Aliases
- **Source code location**: `/packages/cli/src/providers/aliases/`
- Contains JSON files for common services (Cerebras, Fireworks, etc.)
- These files define sensible defaults for each service
- Example files:
  - `cerebras.json`
  - `fireworks.json`
  - `mistral.json`
  - `together.json`
  - `groq.json`
  - etc.

### User Alias Directory
- **Runtime location**: `~/.llxprt/provideraliases/`
- Contains user-created aliases
- JSON files are loaded and merged with pre-configured ones
- If user creates alias with same name as pre-configured, user version takes precedence

### Installation Process
- During installation or first run, copy pre-configured aliases to user directory
- If directory doesn't exist, create it
- Similar pattern to prompt installation in `~/.llxprt/prompts/`

## Settings Application

When an alias is selected through `/provider alias-name`:

1. **Provider Resolution**:
   - Resolve alias name to base provider implementation
   - Use existing provider registration system

2. **Provider Settings**:
   - Apply settings from `providerSettings` section using `SettingsService.setProviderSetting()`
   - Support for model, baseUrl, apiKey, toolFormat, etc.

3. **Ephemeral Settings**:
   - Apply settings from `ephemeralSettings` section using `SettingsService.set()`
   - Configure streaming, context limits, compression thresholds, etc.

4. **Model Parameters**:
   - Apply settings from `modelParameters` section using `SettingsService.setProviderSetting()`
   - Or through the provider's `setModelParams()` method
   - These include temperature, max_tokens, top_p, frequency_penalty, etc.

## Benefits

1. **Simplified Provider Management**:
   - No need for separate provider implementations for services that are OpenAI/Anthropic-compatible
   - Pre-configured best practices for various providers

2. **User Customization**:
   - Users can create their own aliases with custom configurations
   - Easy to switch between different configurations with a single command

3. **Consistency**:
   - Uses existing SettingsService infrastructure
   - Maintains the same pattern as prompt system