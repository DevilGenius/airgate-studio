package studio

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func routeRequest(p *StudioPlugin, method, path string, body []byte) (int, http.Header, []byte, error) {
	ctx := context.Background()
	headers := http.Header{"Content-Type": []string{"application/json"}}

	path = strings.TrimRight(path, "/")

	switch {
	case method == http.MethodPost && path == "/generation-tasks":
		return p.handleCreateGenerationTask(ctx, body, headers)

	case method == http.MethodGet && path == "/generation-tasks":
		return p.handleListGenerationTasks(ctx, body, headers)

	case method == http.MethodGet && strings.HasPrefix(path, "/generation-tasks/"):
		taskIDStr := strings.TrimPrefix(path, "/generation-tasks/")
		return p.handleGetGenerationTask(ctx, taskIDStr, headers)

	case method == http.MethodGet && path == "/platforms":
		return p.handleListPlatforms(ctx, headers)

	case method == http.MethodGet && path == "/models":
		return p.handleListModels(ctx, body, headers)

	default:
		return http.StatusNotFound, headers, jsonError("not found"), nil
	}
}

func (p *StudioPlugin) handleCreateGenerationTask(ctx context.Context, body []byte, headers http.Header) (int, http.Header, []byte, error) {
	var req createGenerationTaskRequest
	if err := json.Unmarshal(body, &req); err != nil {
		return http.StatusBadRequest, headers, jsonError("invalid request body"), nil
	}
	normalizeGenerationRequest(&req)

	if req.Prompt == "" {
		return http.StatusBadRequest, headers, jsonError("prompt is required"), nil
	}
	if req.Model == "" {
		return http.StatusBadRequest, headers, jsonError("model is required"), nil
	}
	if req.GroupID <= 0 {
		return http.StatusBadRequest, headers, jsonError("group_id is required"), nil
	}

	taskType := resolveTaskType(req.Kind, req.Operation)
	input := buildTaskInput(req)
	attributes := buildTaskAttributes(req)

	task, err := hostCreateTask(ctx, p.host, openAIPluginID, taskType, 0, input, attributes)
	if err != nil {
		p.logger.Error("create_generation_task_failed", "error", err)
		return http.StatusInternalServerError, headers, jsonError("创建任务失败: "+err.Error()), nil
	}

	resp := buildGenerationTaskResponse(task)
	respBody, _ := json.Marshal(resp)
	return http.StatusAccepted, headers, respBody, nil
}

func (p *StudioPlugin) handleGetGenerationTask(ctx context.Context, taskIDStr string, headers http.Header) (int, http.Header, []byte, error) {
	taskID, err := strconv.ParseInt(taskIDStr, 10, 64)
	if err != nil || taskID <= 0 {
		return http.StatusBadRequest, headers, jsonError("invalid task_id"), nil
	}

	task, err := hostGetTask(ctx, p.host, 0, taskID)
	if err != nil {
		return http.StatusInternalServerError, headers, jsonError("查询任务失败: "+err.Error()), nil
	}

	resp := buildGenerationTaskResponse(task)
	respBody, _ := json.Marshal(resp)
	return http.StatusOK, headers, respBody, nil
}

func (p *StudioPlugin) handleListGenerationTasks(ctx context.Context, body []byte, headers http.Header) (int, http.Header, []byte, error) {
	limit, offset, status := 20, 0, ""
	var params struct {
		Limit  int    `json:"limit"`
		Offset int    `json:"offset"`
		Status string `json:"status"`
	}
	if len(body) > 0 {
		_ = json.Unmarshal(body, &params)
		if params.Limit > 0 && params.Limit <= 100 {
			limit = params.Limit
		}
		if params.Offset > 0 {
			offset = params.Offset
		}
		status = params.Status
	}

	result, err := hostListTasks(ctx, p.host, 0, "", status, limit, offset)
	if err != nil {
		return http.StatusInternalServerError, headers, jsonError("查询任务列表失败: "+err.Error()), nil
	}

	tasks := make([]map[string]interface{}, 0, len(result.Tasks))
	for _, t := range result.Tasks {
		tasks = append(tasks, buildGenerationTaskResponse(t))
	}

	resp := map[string]interface{}{"tasks": tasks, "total": result.Total}
	respBody, _ := json.Marshal(resp)
	return http.StatusOK, headers, respBody, nil
}

func (p *StudioPlugin) handleListPlatforms(ctx context.Context, headers http.Header) (int, http.Header, []byte, error) {
	platforms, err := hostListPlatforms(ctx, p.host)
	if err != nil {
		return http.StatusInternalServerError, headers, jsonError(err.Error()), nil
	}
	respBody, _ := json.Marshal(map[string]interface{}{"platforms": platforms})
	return http.StatusOK, headers, respBody, nil
}

func (p *StudioPlugin) handleListModels(ctx context.Context, body []byte, headers http.Header) (int, http.Header, []byte, error) {
	var params struct {
		Platform   string `json:"platform"`
		Capability string `json:"capability"`
	}
	if len(body) > 0 {
		_ = json.Unmarshal(body, &params)
	}
	models, err := hostListModels(ctx, p.host, params.Platform, params.Capability)
	if err != nil {
		return http.StatusInternalServerError, headers, jsonError(err.Error()), nil
	}
	respBody, _ := json.Marshal(map[string]interface{}{"models": models})
	return http.StatusOK, headers, respBody, nil
}

func jsonError(message string) []byte {
	body, _ := json.Marshal(map[string]interface{}{
		"error": map[string]interface{}{
			"message": message,
		},
	})
	return body
}

