01: FUNCTION loadProviderAliases()
02:   INITIALIZE empty aliasRegistry map
03:   TRY to read pre-configured aliases directory
04:   FOR each file in pre-configured aliases directory
05:     PARSE JSON file into alias configuration object
06:     VALIDATE configuration against ProviderAliasSchema
07:     ADD to aliasRegistry with name as key
08:   TRY to read user aliases directory (~/.llxprt/provideraliases/)
09:   IF user directory exists
10:     FOR each file in user aliases directory
11:       TRY to parse JSON file
12:       VALIDATE configuration against ProviderAliasSchema
13:       IF validation passes
14:         ADD to aliasRegistry (overwrite pre-configured with same name)
15:         LOG warning in debug mode about overridden alias
16:       ELSE
17:         LOG validation error
18:   RETURN aliasRegistry