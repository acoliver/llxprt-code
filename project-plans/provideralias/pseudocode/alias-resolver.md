01: FUNCTION isAlias(providerName)
02:   RETURN true IF providerName exists in aliasRegistry
03:   ELSE RETURN false

04: FUNCTION resolveProvider(aliasName)
05:   IF aliasName not found in aliasRegistry
06:     THROW ProviderNotFoundError with aliasName
07:   RETURN object with:
08:     baseProvider: aliasRegistry[aliasName].baseProvider
09:     providerSettings: aliasRegistry[aliasName].providerSettings
10:     ephemeralSettings: aliasRegistry[aliasName].ephemeralSettings
11:     modelParameters: aliasRegistry[aliasName].modelParameters