package studio

import sdk "github.com/DevilGenius/airgate-sdk/sdkgo"

const (
	PluginID   = "airgate-studio"
	PluginName = "创作中心"
)

// PluginVersion 插件版本号；release workflow 会通过 git tag 注入正式版本。
var PluginVersion = "0.1.0"

func buildPluginInfo() sdk.PluginInfo {
	return sdk.PluginInfo{
		ID:          PluginID,
		Name:        PluginName,
		Version:     PluginVersion,
		SDKVersion:  sdk.SDKVersion,
		Description: "面向图片、视频、音频等多模态内容生成的统一创作中心",
		Author:      "AirGate",
		Type:        sdk.PluginTypeExtension,
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
				Title:    "创作中心",
				Icon:     "palette",
				Audience: "all",
			},
		},
	}
}
