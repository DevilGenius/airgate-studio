package studio

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	sdk "github.com/DouDOU-start/airgate-sdk/sdkgo"
)

func registerRoutes(p *StudioPlugin, r sdk.RouteRegistrar) {
	r.Handle(http.MethodPost, "/generation-tasks", p.handleCreateGenerationTask)
	r.Handle(http.MethodGet, "/generation-tasks", p.handleListGenerationTasks)
	r.Handle(http.MethodGet, "/generation-tasks/", p.handleGetGenerationTask)
	r.Handle(http.MethodGet, "/platforms", p.handleListPlatforms)
	r.Handle(http.MethodGet, "/models", p.handleListModels)
}

func (p *StudioPlugin) handleCreateGenerationTask(w http.ResponseWriter, r *http.Request) {
	var req createGenerationTaskRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}
	normalizeGenerationRequest(&req)

	if req.Prompt == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "prompt is required"})
		return
	}
	if req.Model == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "model is required"})
		return
	}
	userID, _ := strconv.ParseInt(r.Header.Get("X-Airgate-User-Id"), 10, 64)

	taskType := resolveTaskType(req.Kind, req.Operation)
	input := buildTaskInput(req)
	attributes := buildTaskAttributes(req)

	task, err := hostCreateTask(r.Context(), p.host, PluginID, taskType, userID, input, attributes)
	if err != nil {
		p.logger.Error("create_generation_task_failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "创建任务失败: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusAccepted, buildGenerationTaskResponse(task))
}

func (p *StudioPlugin) handleGetGenerationTask(w http.ResponseWriter, r *http.Request) {
	taskIDStr := strings.TrimPrefix(r.URL.Path, "/generation-tasks/")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil || taskID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid task_id"})
		return
	}

	userID, _ := strconv.ParseInt(r.Header.Get("X-Airgate-User-Id"), 10, 64)
	task, err := hostGetTask(r.Context(), p.host, userID, taskID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "查询任务失败: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, buildGenerationTaskResponse(task))
}

func (p *StudioPlugin) handleListGenerationTasks(w http.ResponseWriter, r *http.Request) {
	userID, _ := strconv.ParseInt(r.Header.Get("X-Airgate-User-Id"), 10, 64)

	limit := 20
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 && v <= 100 {
		limit = v
	}
	offset := 0
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v >= 0 {
		offset = v
	}
	status := r.URL.Query().Get("status")

	result, err := hostListTasks(r.Context(), p.host, userID, "", status, limit, offset)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "查询任务列表失败: " + err.Error()})
		return
	}

	tasks := make([]map[string]interface{}, 0, len(result.Tasks))
	for _, t := range result.Tasks {
		tasks = append(tasks, buildGenerationTaskResponse(t))
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"tasks": tasks, "total": result.Total})
}

func (p *StudioPlugin) handleListPlatforms(w http.ResponseWriter, r *http.Request) {
	platforms, err := hostListPlatforms(r.Context(), p.host)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"platforms": platforms})
}

func (p *StudioPlugin) handleListModels(w http.ResponseWriter, r *http.Request) {
	platform := r.URL.Query().Get("platform")
	capability := r.URL.Query().Get("capability")
	models, err := hostListModels(r.Context(), p.host, platform, capability)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"models": models})
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
