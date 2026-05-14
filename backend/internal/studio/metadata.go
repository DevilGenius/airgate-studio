package studio

import sdk "github.com/DouDOU-start/airgate-sdk/sdkgo"

const (
	PluginID   = "airgate-studio"
	PluginName = "创作工作台"
)

func buildPluginInfo() sdk.PluginInfo {
	return sdk.PluginInfo{
		ID:   PluginID,
		Name: PluginName,
		Type: sdk.PluginTypeExtension,
		Capabilities: []sdk.Capability{
			sdk.CapabilityHostInvoke,
			sdk.CapabilityForHostMethod(hostMethodTasksCreate),
			sdk.CapabilityForHostMethod(hostMethodTasksGet),
			sdk.CapabilityForHostMethod(hostMethodTasksList),
			sdk.CapabilityForHostMethod(hostMethodPlatformsList),
			sdk.CapabilityForHostMethod(hostMethodModelsList),
			sdk.CapabilityForHostMethod(hostMethodUsersGet),
		},
		FrontendPages: []sdk.FrontendPage{
			{
				Path:     "/studio",
				Title:    "创作工作台",
				Icon:     "palette",
				Audience: "all",
			},
		},
	}
}
