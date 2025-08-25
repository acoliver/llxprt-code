# Pseudocode: Loop Detection Settings Implementation

## Config.getLoopDetectionEnabled()

```
10: METHOD getLoopDetectionEnabled(): boolean
11:   DECLARE profileSetting as optional boolean
12:   DECLARE globalSetting as optional boolean
13:   
14:   // Get current profile from ProfileManager
15:   SET currentProfile = this.profileManager.getCurrentProfile()
16:   
17:   // Check profile setting
18:   IF currentProfile exists AND currentProfile.loopDetectionEnabled is defined
19:     RETURN currentProfile.loopDetectionEnabled
20:   END IF
21:   
22:   // Check global setting
23:   SET globalSettings = this.settingsService.getSettings()
24:   IF globalSettings exists AND globalSettings.loopDetectionEnabled is defined
25:     RETURN globalSettings.loopDetectionEnabled
26:   END IF
27:   
28:   // Return system default
29:   RETURN false
30: END METHOD
```

## LoopDetectionService.turnStarted() Modification

```
40: METHOD turnStarted(signal: AbortSignal): Promise<boolean>
41:   // Check if loop detection is enabled
42:   SET enabled = this.config.getLoopDetectionEnabled()
43:   
44:   IF enabled is false
45:     // Skip all loop detection processing
46:     RETURN false
47:   END IF
48:   
49:   // Continue with existing loop detection logic
50:   SET turnsInPrompt = this.turnsInCurrentPrompt
51:   INCREMENT this.turnsInCurrentPrompt
52:   
53:   // ... rest of existing logic ...
54:   RETURN existingLoopDetectionResult
55: END METHOD
```

## SetCommand Handler for loop-detection

```
60: METHOD handleLoopDetectionCommand(value: string): CommandResult
61:   // Validate input
62:   IF value is not "true" AND value is not "false"
63:     RETURN {
64:       type: "error",
65:       message: "Invalid value. Use 'true' or 'false'"
66:     }
67:   END IF
68:   
69:   // Parse boolean value
70:   SET booleanValue = (value === "true")
71:   
72:   // Get current profile
73:   SET profileManager = new ProfileManager()
74:   SET currentProfileName = this.config.getCurrentProfileName()
75:   
76:   IF currentProfileName is null
77:     RETURN {
78:       type: "error", 
79:       message: "No active profile"
80:     }
81:   END IF
82:   
83:   // Load current profile
84:   SET profile = await profileManager.loadProfile(currentProfileName)
85:   
86:   IF profile is null
87:     RETURN {
88:       type: "error",
89:       message: "Failed to load profile"
90:     }
91:   END IF
92:   
93:   // Update profile with new setting
94:   SET profile.loopDetectionEnabled = booleanValue
95:   
96:   // Save updated profile
97:   TRY
98:     await profileManager.saveProfile(currentProfileName, profile)
99:   CATCH error
100:    RETURN {
101:      type: "error",
102:      message: "Failed to save profile: " + error.message
103:    }
104:  END TRY
105:  
106:  // Update in-memory settings
107:  this.config.updateCurrentProfile(profile)
108:  
109:  // Return success message
110:  SET status = booleanValue ? "enabled" : "disabled"
111:  RETURN {
112:    type: "success",
113:    message: "Loop detection " + status + " for profile " + currentProfileName
114:  }
115: END METHOD
```

## Profile Schema Update

```
120: INTERFACE Profile
121:   version: 1
122:   provider: string
123:   model: string  
124:   modelParams: ModelParams
125:   ephemeralSettings: EphemeralSettings
126:   loopDetectionEnabled?: boolean  // NEW FIELD - optional
127: END INTERFACE
```

## Global Settings Schema Update

```
130: INTERFACE GlobalSettings
131:   // ... existing fields ...
132:   loopDetectionEnabled?: boolean  // NEW FIELD - optional
133: END INTERFACE
```

## Status Command Integration

```
140: METHOD getStatusInfo(): StatusInfo
141:   SET loopDetectionEnabled = this.config.getLoopDetectionEnabled()
142:   
143:   RETURN {
144:     // ... existing status fields ...
145:     loopDetection: loopDetectionEnabled ? "enabled" : "disabled"
146:   }
147: END METHOD
```