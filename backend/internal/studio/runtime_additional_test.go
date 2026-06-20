package studio

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"
)

type studioFakeHost struct {
	responses map[string]*sdk.HostInvokeResponse
	errors    map[string]error
	calls     []sdk.HostInvokeRequest
}

func (h *studioFakeHost) Invoke(_ context.Context, req sdk.HostInvokeRequest) (*sdk.HostInvokeResponse, error) {
	h.calls = append(h.calls, req)
	if err := h.errors[req.Method]; err != nil {
		return nil, err
	}
	return h.responses[req.Method], nil
}

func (h *studioFakeHost) InvokeStream(context.Context, sdk.HostStreamRequest) (sdk.HostStream, error) {
	return nil, errors.New("not implemented")
}

type studioFakeContext struct {
	logger *slog.Logger
	host   sdk.Host
}

func (c studioFakeContext) Logger() *slog.Logger { return c.logger }
func (studioFakeContext) Config() sdk.PluginConfig {
	return studioEmptyConfig{}
}
func (c studioFakeContext) Host() sdk.Host { return c.host }

type studioEmptyConfig struct{}

func (studioEmptyConfig) GetString(string) string          { return "" }
func (studioEmptyConfig) GetInt(string) int                { return 0 }
func (studioEmptyConfig) GetBool(string) bool              { return false }
func (studioEmptyConfig) GetFloat64(string) float64        { return 0 }
func (studioEmptyConfig) GetDuration(string) time.Duration { return 0 }
func (studioEmptyConfig) GetAll() map[string]string        { return nil }

type studioRouteRecorder struct {
	routes map[string]http.HandlerFunc
	prefix string
}

func (r *studioRouteRecorder) Handle(method, path string, handler http.HandlerFunc) {
	if r.routes == nil {
		r.routes = make(map[string]http.HandlerFunc)
	}
	r.routes[method+" "+r.prefix+path] = handler
}

func (r *studioRouteRecorder) Group(prefix string) sdk.RouteRegistrar {
	return &studioRouteRecorder{routes: r.routes, prefix: r.prefix + prefix}
}

func TestNormalizeAndGenerationHelpersAdditional(t *testing.T) {
	req := createGenerationTaskRequest{
		Kind:      "  ",
		Operation: " ",
		Model:     "gpt-image-2",
		Prompt:    "paint",
		GroupID:   9,
		Parameters: map[string]interface{}{
			"":        "skip",
			"model":   "ignored",
			"prompt":  "ignored",
			"quality": "hd",
			"empty":   " ",
			"nil":     nil,
		},
		Inputs: []generationInput{
			{Type: "image", URL: " https://example.test/a.png "},
			{Type: "text", URL: "https://example.test/skip.txt"},
			{Type: "image", Role: "mask", URL: "https://example.test/mask.png"},
			{URL: ""},
		},
	}
	normalizeGenerationRequest(&req)
	if req.Kind != "image" || req.Operation != "generate" {
		t.Fatalf("normalized request = %#v", req)
	}
	if got := resolveTaskType("image", "inpaint"); got != "image.edit" {
		t.Fatalf("resolveTaskType inpaint = %q", got)
	}
	if got := resolveTaskType("video", "generate"); got != "video.generate" {
		t.Fatalf("resolveTaskType custom = %q", got)
	}

	input := buildTaskInput(req)
	if input["group_id"] != int64(9) || input["quality"] != "hd" || input["model"] != "gpt-image-2" {
		t.Fatalf("task input = %#v", input)
	}
	if _, ok := input["empty"]; ok {
		t.Fatalf("blank string parameter was not skipped: %#v", input)
	}
	images := input["images"].([]string)
	if len(images) != 1 || images[0] != "https://example.test/a.png" {
		t.Fatalf("images = %#v", images)
	}

	attrs := buildTaskAttributes(req)
	if attrs["kind"] != "image" || attrs["operation"] != "generate" || attrs["quality"] != "hd" {
		t.Fatalf("attributes = %#v", attrs)
	}
}

func TestGenerationURLValidationAdditional(t *testing.T) {
	valid := createGenerationTaskRequest{
		Inputs: []generationInput{
			{Type: "image", URL: "data:image/png;base64,abc"},
			{Type: "image", URL: "https://example.test/a.png"},
			{Type: "text", URL: "file:///ignored"},
		},
		Mask: &generationInput{URL: "http://example.test/mask.png"},
	}
	if err := validateGenerationInputURLs(valid); err != nil {
		t.Fatalf("valid urls rejected: %v", err)
	}
	if err := validateGenerationInputURLs(createGenerationTaskRequest{
		Inputs: []generationInput{{Type: "image", URL: "file:///tmp/a.png"}},
	}); err == nil {
		t.Fatalf("invalid image input was accepted")
	}
	if err := validateGenerationInputURLs(createGenerationTaskRequest{
		Mask: &generationInput{URL: "javascript:alert(1)"},
	}); err == nil {
		t.Fatalf("invalid mask input was accepted")
	}
	if isAllowedGenerationImageURL("ftp://example.test/a.png") {
		t.Fatalf("ftp url should not be accepted")
	}
}

func TestBuildGenerationTaskResponseAdditional(t *testing.T) {
	task := &hostTask{
		ID:          7,
		Status:      "completed",
		Progress:    100,
		CreatedAt:   "now",
		CompletedAt: "done",
		Input: map[string]interface{}{
			"prompt": "draw",
			"model":  "fallback-model",
			"size":   "1024x1024",
		},
		Output: map[string]interface{}{
			"content":       "image",
			"input_tokens":  1,
			"output_tokens": 2,
			"cost":          0.3,
			"usage_id":      int64(8),
		},
		Attributes: map[string]interface{}{
			"operation": "generate",
			"quality":   "hd",
		},
		ErrorMessage: "late warning",
	}
	resp := buildGenerationTaskResponse(task)
	if resp["task_id"] != int64(7) || resp["result_content"] != "image" || resp["model"] != "fallback-model" {
		t.Fatalf("response = %#v", resp)
	}
	if resp["completed_at"] != "done" || resp["error_message"] != "late warning" {
		t.Fatalf("response missing terminal fields: %#v", resp)
	}
	if resp["size"] != "1024x1024" || resp["quality"] != "hd" || resp["operation"] != "generate" {
		t.Fatalf("response missing display fields: %#v", resp)
	}
}

func TestHostInvokeAndTaskParsingAdditional(t *testing.T) {
	if _, err := hostInvoke(context.Background(), nil, "x", nil); err == nil {
		t.Fatalf("nil host should fail")
	}

	host := &studioFakeHost{
		responses: map[string]*sdk.HostInvokeResponse{
			"nil":       nil,
			"ok":        {Status: "ok", Payload: map[string]interface{}{"value": 1}},
			"bad":       {Status: "error", Payload: map[string]interface{}{"message": "boom"}},
			"bad-empty": {Status: "error", Payload: map[string]interface{}{}},
		},
		errors: map[string]error{"transport": errors.New("transport failed")},
	}
	if resp, err := hostInvoke(context.Background(), host, "nil", nil); err != nil || len(resp) != 0 {
		t.Fatalf("nil response = %#v, %v", resp, err)
	}
	if resp, err := hostInvoke(context.Background(), host, "ok", nil); err != nil || resp["value"] != 1 {
		t.Fatalf("ok response = %#v, %v", resp, err)
	}
	if _, err := hostInvoke(context.Background(), host, "bad", nil); err == nil {
		t.Fatalf("error status should fail")
	}
	if _, err := hostInvoke(context.Background(), host, "bad-empty", nil); err == nil {
		t.Fatalf("error status without message should fail")
	}
	if _, err := hostInvoke(context.Background(), host, "transport", nil); err == nil {
		t.Fatalf("transport error should fail")
	}

	task, err := hostTaskFromPayload(map[string]interface{}{"id": 3, "status": "queued"})
	if err != nil || task.ID != 3 || task.Status != "queued" {
		t.Fatalf("task = %#v, %v", task, err)
	}
	if _, err := hostTaskFromPayload(nil); err == nil {
		t.Fatalf("nil task payload should fail")
	}
	if _, err := hostTaskFromPayload(map[string]interface{}{"bad": make(chan int)}); err == nil {
		t.Fatalf("unmarshalable task payload should fail")
	}
	if got := firstValue(nil, "a"); got != nil {
		t.Fatalf("nil firstValue = %v", got)
	}
	payload := map[string]interface{}{"x": 1}
	if got := firstValue(payload, ""); got == nil {
		t.Fatalf("empty key should return payload")
	}
	if got := firstValue(map[string]interface{}{"b": 2}, "a", "b"); got != 2 {
		t.Fatalf("firstValue = %v", got)
	}
	if got := intFromAny(int64(41)); got != 41 {
		t.Fatalf("int64 intFromAny = %d", got)
	}
	if got := intFromAny(float64(40)); got != 40 {
		t.Fatalf("float64 intFromAny = %d", got)
	}
	if got := intFromAny(json.Number("42")); got != 42 {
		t.Fatalf("json.Number intFromAny = %d", got)
	}
	if got := intFromAny("nope"); got != 0 {
		t.Fatalf("string intFromAny = %d", got)
	}
}

func TestHostTaskOperationsAdditional(t *testing.T) {
	host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
		hostMethodTasksCreate: {Status: "ok", Payload: map[string]interface{}{"task": map[string]interface{}{"id": 1, "status": "pending"}}},
		hostMethodTasksGet:    {Status: "ok", Payload: map[string]interface{}{"data": map[string]interface{}{"id": 2, "user_id": 9}}},
		hostMethodTasksList: {Status: "ok", Payload: map[string]interface{}{
			"items": []interface{}{
				map[string]interface{}{"id": 3, "status": "done"},
				map[string]interface{}{"id": 4, "status": "failed"},
			},
			"count": float64(12),
		}},
		hostMethodTasksDelete:   {Status: "ok", Payload: map[string]interface{}{}},
		hostMethodPlatformsList: {Status: "ok", Payload: map[string]interface{}{"platforms": []interface{}{"openai"}}},
		hostMethodModelsList:    {Status: "ok", Payload: map[string]interface{}{"models": []interface{}{map[string]interface{}{"id": "m"}}}},
	}}

	task, err := hostCreateTask(context.Background(), host, "plugin", "image.generate", 9, map[string]interface{}{"prompt": "p"}, map[string]interface{}{"kind": "image"})
	if err != nil || task.ID != 1 {
		t.Fatalf("create task = %#v, %v", task, err)
	}
	got, err := hostGetTask(context.Background(), host, "plugin", 9, 2)
	if err != nil || got.UserID != 9 {
		t.Fatalf("get task = %#v, %v", got, err)
	}
	list, err := hostListTasks(context.Background(), host, "plugin", 9, "image.generate", "done", 5, 10)
	if err != nil || len(list.Tasks) != 2 || list.Total != 12 {
		t.Fatalf("list = %#v, %v", list, err)
	}
	if err := hostDeleteTask(context.Background(), host, "", 9, 2); err != nil {
		t.Fatalf("delete task: %v", err)
	}
	if platforms, err := hostListPlatforms(context.Background(), host); err != nil || len(platforms) != 1 {
		t.Fatalf("platforms = %#v, %v", platforms, err)
	}
	if models, err := hostListModels(context.Background(), host, "openai", "image"); err != nil || len(models) != 1 {
		t.Fatalf("models = %#v, %v", models, err)
	}

	host.responses[hostMethodTasksList] = &sdk.HostInvokeResponse{Status: "ok", Payload: map[string]interface{}{
		"tasks": []interface{}{map[string]interface{}{"id": 5}},
	}}
	list, err = hostListTasks(context.Background(), host, "", 9, "", "", 20, 0)
	if err != nil || list.Total != 1 {
		t.Fatalf("list fallback total = %#v, %v", list, err)
	}
	host.responses[hostMethodTasksList] = &sdk.HostInvokeResponse{Status: "ok", Payload: map[string]interface{}{
		"tasks": []interface{}{map[string]interface{}{"bad": make(chan int)}},
	}}
	if _, err := hostListTasks(context.Background(), host, "", 9, "", "", 20, 0); err == nil {
		t.Fatalf("bad task list item should fail")
	}
	host.responses[hostMethodPlatformsList] = &sdk.HostInvokeResponse{Status: "ok", Payload: map[string]interface{}{}}
	if platforms, err := hostListPlatforms(context.Background(), host); err != nil || platforms != nil {
		t.Fatalf("empty platforms = %#v, %v", platforms, err)
	}
	host.responses[hostMethodModelsList] = &sdk.HostInvokeResponse{Status: "ok", Payload: map[string]interface{}{}}
	if models, err := hostListModels(context.Background(), host, "", ""); err != nil || models != nil {
		t.Fatalf("empty models = %#v, %v", models, err)
	}
}

func TestRoutesAdditional(t *testing.T) {
	host := &studioFakeHost{responses: map[string]*sdk.HostInvokeResponse{
		hostMethodTasksCreate: {Status: "ok", Payload: map[string]interface{}{"task": map[string]interface{}{"id": 10, "user_id": 42, "status": "queued", "input": map[string]interface{}{"prompt": "p"}}}},
		hostMethodTasksGet:    {Status: "ok", Payload: map[string]interface{}{"task": map[string]interface{}{"id": 10, "user_id": 42, "status": "done"}}},
		hostMethodTasksList:   {Status: "ok", Payload: map[string]interface{}{"tasks": []interface{}{map[string]interface{}{"id": 10, "user_id": 42}}, "total": 1}},
		hostMethodTasksDelete: {Status: "ok", Payload: map[string]interface{}{}},
		hostMethodPlatformsList: {
			Status:  "ok",
			Payload: map[string]interface{}{"items": []interface{}{"openai"}},
		},
		hostMethodModelsList: {
			Status:  "ok",
			Payload: map[string]interface{}{"data": []interface{}{map[string]interface{}{"id": "gpt-image-2"}}},
		},
	}}
	plugin := &StudioPlugin{host: host, logger: slog.New(slog.NewTextHandler(os.Stderr, nil))}

	rec := httptest.NewRecorder()
	body := []byte(`{"prompt":"p","model":"gpt-image-2","inputs":[{"type":"image","url":"https://example.test/a.png"}]}`)
	req := studioRequest(http.MethodPost, "/generation-tasks", body, 42)
	plugin.handleCreateGenerationTask(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("create status = %d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	plugin.handleGetGenerationTask(rec, studioRequest(http.MethodGet, "/generation-tasks/10", nil, 42))
	if rec.Code != http.StatusOK {
		t.Fatalf("get status = %d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	plugin.handleListGenerationTasks(rec, studioRequest(http.MethodGet, "/generation-tasks?limit=2&offset=1&status=done", nil, 42))
	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/10", nil, 42))
	if rec.Code != http.StatusOK {
		t.Fatalf("delete status = %d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	plugin.handleListPlatforms(rec, studioRequest(http.MethodGet, "/platforms", nil, 42))
	if rec.Code != http.StatusOK {
		t.Fatalf("platforms status = %d body=%s", rec.Code, rec.Body.String())
	}

	rec = httptest.NewRecorder()
	plugin.handleListModels(rec, studioRequest(http.MethodGet, "/models?platform=openai&capability=image", nil, 42))
	if rec.Code != http.StatusOK {
		t.Fatalf("models status = %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRouteErrorsAdditional(t *testing.T) {
	plugin := &StudioPlugin{
		host: &studioFakeHost{
			responses: map[string]*sdk.HostInvokeResponse{
				hostMethodTasksGet: {Status: "ok", Payload: map[string]interface{}{"task": map[string]interface{}{"id": 10, "user_id": 99}}},
			},
			errors: map[string]error{
				hostMethodTasksCreate:   errors.New("create failed"),
				hostMethodTasksList:     errors.New("list failed"),
				hostMethodTasksDelete:   errors.New("delete failed"),
				hostMethodPlatformsList: errors.New("platforms failed"),
				hostMethodModelsList:    errors.New("models failed"),
			},
		},
		logger: slog.Default(),
	}

	cases := []struct {
		name string
		run  func() *httptest.ResponseRecorder
		want int
	}{
		{"create bad json", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte("{"), 42))
			return rec
		}, http.StatusBadRequest},
		{"create missing prompt", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte(`{"model":"m"}`), 42))
			return rec
		}, http.StatusBadRequest},
		{"create missing model", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte(`{"prompt":"p"}`), 42))
			return rec
		}, http.StatusBadRequest},
		{"create invalid url", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte(`{"prompt":"p","model":"m","inputs":[{"type":"image","url":"file:///a"}]}`), 42))
			return rec
		}, http.StatusBadRequest},
		{"create unauthorized", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte(`{"prompt":"p","model":"m"}`), 0))
			return rec
		}, http.StatusUnauthorized},
		{"create host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleCreateGenerationTask(rec, studioRequest(http.MethodPost, "/generation-tasks", []byte(`{"prompt":"p","model":"m"}`), 42))
			return rec
		}, http.StatusInternalServerError},
		{"get invalid id", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleGetGenerationTask(rec, studioRequest(http.MethodGet, "/generation-tasks/nope", nil, 42))
			return rec
		}, http.StatusBadRequest},
		{"get unauthorized", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleGetGenerationTask(rec, studioRequest(http.MethodGet, "/generation-tasks/10", nil, 0))
			return rec
		}, http.StatusUnauthorized},
		{"get host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.host.(*studioFakeHost).errors[hostMethodTasksGet] = errors.New("get failed")
			defer delete(plugin.host.(*studioFakeHost).errors, hostMethodTasksGet)
			plugin.handleGetGenerationTask(rec, studioRequest(http.MethodGet, "/generation-tasks/10", nil, 42))
			return rec
		}, http.StatusInternalServerError},
		{"delete invalid id", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/0", nil, 42))
			return rec
		}, http.StatusBadRequest},
		{"delete unauthorized", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/10", nil, 0))
			return rec
		}, http.StatusUnauthorized},
		{"delete forbidden", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/10", nil, 42))
			return rec
		}, http.StatusForbidden},
		{"delete lookup error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.host.(*studioFakeHost).errors[hostMethodTasksGet] = errors.New("get failed")
			defer delete(plugin.host.(*studioFakeHost).errors, hostMethodTasksGet)
			plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/10", nil, 42))
			return rec
		}, http.StatusInternalServerError},
		{"delete host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.host.(*studioFakeHost).responses[hostMethodTasksGet] = &sdk.HostInvokeResponse{Status: "ok", Payload: map[string]interface{}{"task": map[string]interface{}{"id": 10, "user_id": 42}}}
			plugin.handleDeleteGenerationTask(rec, studioRequest(http.MethodDelete, "/generation-tasks/10", nil, 42))
			return rec
		}, http.StatusInternalServerError},
		{"list host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleListGenerationTasks(rec, studioRequest(http.MethodGet, "/generation-tasks", nil, 42))
			return rec
		}, http.StatusInternalServerError},
		{"platform host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleListPlatforms(rec, studioRequest(http.MethodGet, "/platforms", nil, 42))
			return rec
		}, http.StatusInternalServerError},
		{"models host error", func() *httptest.ResponseRecorder {
			rec := httptest.NewRecorder()
			plugin.handleListModels(rec, studioRequest(http.MethodGet, "/models", nil, 42))
			return rec
		}, http.StatusInternalServerError},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.run().Code; got != tc.want {
				t.Fatalf("status = %d, want %d", got, tc.want)
			}
		})
	}
}

func TestPluginMetadataLifecycleAssetsAndRouteRegistrationAdditional(t *testing.T) {
	host := &studioFakeHost{}
	plugin := &StudioPlugin{}
	if err := plugin.Init(studioFakeContext{
		logger: slog.New(slog.NewTextHandler(os.Stderr, nil)),
		host:   host,
	}); err != nil {
		t.Fatalf("Init: %v", err)
	}
	if plugin.host != host || plugin.logger == nil {
		t.Fatalf("plugin init did not keep host/logger")
	}
	if err := plugin.Start(context.Background()); err != nil {
		t.Fatalf("Start: %v", err)
	}
	if err := plugin.Stop(context.Background()); err != nil {
		t.Fatalf("Stop: %v", err)
	}
	if err := plugin.Migrate(); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if tasks := plugin.BackgroundTasks(); tasks != nil {
		t.Fatalf("BackgroundTasks = %#v", tasks)
	}
	info := plugin.Info()
	if info.ID != PluginID || info.Name != PluginName || len(info.Capabilities) == 0 || len(info.FrontendPages) != 1 {
		t.Fatalf("info = %#v", info)
	}

	recorder := &studioRouteRecorder{}
	plugin.RegisterRoutes(recorder)
	if len(recorder.routes) != 6 {
		t.Fatalf("registered routes = %#v", recorder.routes)
	}

	assets := plugin.GetWebAssets()
	if _, ok := assets[".gitkeep"]; ok {
		t.Fatalf("GetWebAssets leaked .gitkeep")
	}

	devRoot := t.TempDir()
	if err := os.MkdirAll(filepath.Join(devRoot, "web", "dist"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(devRoot, "web", "dist", "index.html"), []byte("dev"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Chdir(devRoot)
	assets = plugin.GetWebAssets()
	if string(assets["index.html"]) != "dev" {
		t.Fatalf("dev GetWebAssets = %#v", assets)
	}

	root := t.TempDir()
	if got := loadAssetsFromDir(filepath.Join(root, "missing")); got != nil {
		t.Fatalf("missing assets = %#v", got)
	}
	if err := os.WriteFile(filepath.Join(root, "index.html"), []byte("hello"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, "assets"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "assets", "app.js"), []byte("js"), 0o600); err != nil {
		t.Fatal(err)
	}
	got := loadAssetsFromDir(root)
	if string(got["index.html"]) != "hello" || string(got["assets/app.js"]) != "js" {
		t.Fatalf("loaded assets = %#v", got)
	}
}

func TestRequireUserAndWriteJSONAdditional(t *testing.T) {
	plugin := &StudioPlugin{}
	called := false
	handler := plugin.requireUser(func(w http.ResponseWriter, r *http.Request) {
		called = true
		writeJSON(w, http.StatusCreated, map[string]string{"ok": "true"})
	})

	rec := httptest.NewRecorder()
	handler(rec, studioRequest(http.MethodGet, "/x", nil, 5))
	if !called || rec.Code != http.StatusCreated || rec.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("authorized response status=%d called=%v headers=%v", rec.Code, called, rec.Header())
	}

	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("X-Airgate-Entry", "guest")
	handler(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("guest status = %d", rec.Code)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("X-Airgate-Entry", "admin")
	handler(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("missing user id status = %d", rec.Code)
	}
}

func studioRequest(method, target string, body []byte, userID int64) *http.Request {
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		reader = bytes.NewReader(body)
	}
	req := httptest.NewRequest(method, target, reader)
	req.Header.Set("X-Airgate-Entry", "user")
	if userID > 0 {
		req.Header.Set("X-Airgate-User-Id", strconv.FormatInt(userID, 10))
	}
	return req
}
