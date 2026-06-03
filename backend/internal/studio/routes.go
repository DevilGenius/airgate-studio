package studio

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	sdk "github.com/DevilGenius/airgate-sdk/sdkgo"
)

func registerRoutes(p *StudioPlugin, r sdk.RouteRegistrar) {
	r.Handle(http.MethodPost, "/generation-tasks", p.requireUser(p.handleCreateGenerationTask))
	r.Handle(http.MethodGet, "/generation-tasks", p.requireUser(p.handleListGenerationTasks))
	r.Handle(http.MethodGet, "/generation-tasks/", p.requireUser(p.handleGetGenerationTask))
	r.Handle(http.MethodDelete, "/generation-tasks/", p.requireUser(p.handleDeleteGenerationTask))
	r.Handle(http.MethodGet, "/platforms", p.requireUser(p.handleListPlatforms))
	r.Handle(http.MethodGet, "/models", p.requireUser(p.handleListModels))
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
	if err := validateGenerationInputURLs(req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	userID, ok := userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	taskType := resolveTaskType(req.Kind, req.Operation)
	input := buildTaskInput(req)
	attributes := buildTaskAttributes(req)

	task, err := hostCreateTask(r.Context(), p.host, executorPluginID, taskType, userID, input, attributes)
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

	userID, ok := userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	task, err := hostGetTask(r.Context(), p.host, executorPluginID, userID, taskID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "查询任务失败: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, buildGenerationTaskResponse(task))
}

func (p *StudioPlugin) handleDeleteGenerationTask(w http.ResponseWriter, r *http.Request) {
	taskIDStr := strings.TrimPrefix(r.URL.Path, "/generation-tasks/")
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil || taskID <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid task_id"})
		return
	}

	userID, ok := userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}
	task, err := hostGetTask(r.Context(), p.host, executorPluginID, userID, taskID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "查询任务失败: " + err.Error()})
		return
	}
	if task.UserID != 0 && task.UserID != userID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err := hostDeleteTask(r.Context(), p.host, executorPluginID, userID, taskID); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "删除任务失败: " + err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (p *StudioPlugin) handleListGenerationTasks(w http.ResponseWriter, r *http.Request) {
	userID, ok := userIDFromRequest(r)
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	limit := 20
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 && v <= 100 {
		limit = v
	}
	offset := 0
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v >= 0 {
		offset = v
	}
	status := r.URL.Query().Get("status")

	result, err := hostListTasks(r.Context(), p.host, executorPluginID, userID, "", status, limit, offset)
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

func (p *StudioPlugin) requireUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		entry := r.Header.Get("X-Airgate-Entry")
		if entry != "user" && entry != "admin" {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		if _, ok := userIDFromRequest(r); !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
			return
		}
		next(w, r)
	}
}

func userIDFromRequest(r *http.Request) (int64, bool) {
	userID, err := strconv.ParseInt(r.Header.Get("X-Airgate-User-Id"), 10, 64)
	return userID, err == nil && userID > 0
}
