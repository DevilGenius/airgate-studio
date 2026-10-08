package studio

import (
	"context"
	"testing"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"
)

func TestHostTaskRejectsLegacyEnvelopes(t *testing.T) {
	for _, key := range []string{"data", "result", ""} {
		t.Run(key, func(t *testing.T) {
			payload := map[string]interface{}{"id": 1, "status": "pending"}
			if key != "" {
				payload = map[string]interface{}{key: payload}
			}
			host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
				hostMethodTasksCreate: {Status: "ok", Payload: payload},
				hostMethodTasksGet:    {Status: "ok", Payload: payload},
			}}
			if _, err := hostCreateTask(context.Background(), host, executorPluginID, "image.generate", 1, nil, nil); err == nil {
				t.Fatal("create accepted legacy task envelope")
			}
			if _, err := hostGetTask(context.Background(), host, executorPluginID, 1, 1); err == nil {
				t.Fatal("get accepted legacy task envelope")
			}
		})
	}
}

func TestHostListsRejectLegacyFields(t *testing.T) {
	for _, key := range []string{"items", "data"} {
		t.Run(key, func(t *testing.T) {
			payload := map[string]interface{}{key: []interface{}{}, "total": 0}
			host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
				hostMethodTasksList:     {Status: "ok", Payload: payload},
				hostMethodPlatformsList: {Status: "ok", Payload: payload},
				hostMethodModelsList:    {Status: "ok", Payload: payload},
			}}
			if _, err := hostListTasks(context.Background(), host, executorPluginID, 1, "", "", 20, 0); err == nil {
				t.Fatal("accepted legacy task list")
			}
			if _, err := hostListPlatforms(context.Background(), host); err == nil {
				t.Fatal("accepted legacy platform list")
			}
			if _, err := hostListModels(context.Background(), host, "openai", "image"); err == nil {
				t.Fatal("accepted legacy model list")
			}
		})
	}
	for _, payload := range []map[string]interface{}{
		{"tasks": []interface{}{}, "count": 0},
		{"tasks": []interface{}{}, "total": "0"},
	} {
		host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
			hostMethodTasksList: {Status: "ok", Payload: payload},
		}}
		if _, err := hostListTasks(context.Background(), host, executorPluginID, 1, "", "", 20, 0); err == nil {
			t.Fatalf("accepted invalid total: %#v", payload)
		}
	}
}

func TestHostListsAcceptEmptyCurrentResponse(t *testing.T) {
	host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
		hostMethodTasksList:     {Status: "ok", Payload: map[string]interface{}{"tasks": []interface{}{}, "total": 0}},
		hostMethodPlatformsList: {Status: "ok", Payload: map[string]interface{}{"platforms": []interface{}{}}},
		hostMethodModelsList:    {Status: "ok", Payload: map[string]interface{}{"models": []interface{}{}}},
	}}
	list, err := hostListTasks(context.Background(), host, executorPluginID, 1, "", "", 20, 0)
	if err != nil || list.Total != 0 || list.Tasks == nil || len(list.Tasks) != 0 {
		t.Fatalf("empty task list = %#v, %v", list, err)
	}
	if items, err := hostListPlatforms(context.Background(), host); err != nil || items == nil || len(items) != 0 {
		t.Fatalf("empty platforms = %#v, %v", items, err)
	}
	if items, err := hostListModels(context.Background(), host, "openai", "image"); err != nil || items == nil || len(items) != 0 {
		t.Fatalf("empty models = %#v, %v", items, err)
	}
}

func TestTaskCapabilitiesMatchStudioMethods(t *testing.T) {
	capabilities := buildPluginInfo().Capabilities
	for _, method := range []string{hostMethodTasksCreate, hostMethodTasksGet, hostMethodTasksList, hostMethodTasksDelete} {
		found := false
		for _, capability := range capabilities {
			if capability == sdk.CapabilityForHostMethod(method) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("missing capability for %s", method)
		}
	}
}
