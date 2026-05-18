# AirGate 创作中心插件 Makefile

GO := GOTOOLCHAIN=local GOPRIVATE=github.com/DouDOU-start/airgate-sdk GONOPROXY=github.com/DouDOU-start/airgate-sdk go

WEBDIST := backend/internal/studio/webdist

.PHONY: help install build build-web build-backend release dev ensure-webdist clean test vet ci type-check fmt

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ===================== 构建 =====================

install: ## 安装前后端依赖
	cd web && pnpm install
	cd backend && $(GO) mod download
	@echo "依赖安装完成"

build: build-web build-backend ## 完整构建：前端 → 嵌入后端 → 编译

build-web: ## 构建插件前端
	cd web && pnpm build

build-backend: ensure-webdist ## 构建后端二进制
	mkdir -p bin
	cd backend && $(GO) build -o ../bin/airgate-studio .

release: build-web ## 编译 Linux amd64 版本（用于上传到 marketplace）
	rm -rf $(WEBDIST)
	cp -r web/dist $(WEBDIST)
	touch $(WEBDIST)/.gitkeep
	mkdir -p bin
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -buildvcs=false -trimpath -ldflags "-X 'github.com/DouDOU-start/airgate-studio/backend/internal/studio.PluginVersion=$${VERSION:-dev}'" -o ../bin/airgate-studio-linux-amd64 .
	@echo "构建完成: bin/airgate-studio-linux-amd64"

# 把 web/dist 同步到 backend/internal/studio/webdist；若 web 未构建则保留 placeholder。
ensure-webdist:
	@if [ -d web/dist ] && [ "$$(ls -A web/dist 2>/dev/null)" ]; then \
		rm -rf $(WEBDIST); \
		cp -r web/dist $(WEBDIST); \
		touch $(WEBDIST)/.gitkeep; \
		echo "已同步 web/dist → $(WEBDIST)"; \
	elif [ ! "$$(ls -A $(WEBDIST) 2>/dev/null)" ]; then \
		mkdir -p $(WEBDIST); \
		touch $(WEBDIST)/.gitkeep; \
		echo "未发现 web/dist，写入 placeholder（前端将不可用）"; \
	fi

# ===================== 开发 =====================

dev: build-web ## 构建前端资产并提示如何在 core 里 dev 加载本插件
	@echo "在 airgate-core/backend/config.yaml 的 plugins.dev 节追加："
	@echo ""
	@echo "  plugins:"
	@echo "    dev:"
	@echo "      - name: airgate-studio"
	@echo "        path: $(realpath ./backend)"
	@echo ""
	@echo "然后启动 core: cd airgate-core/backend && go run ./cmd/server"

# ===================== 质量检查 =====================

ci: ensure-webdist type-check vet test build-backend ## 本地运行与 CI 完全一致的检查

type-check: ## 前端 TypeScript 类型检查
	cd web && pnpm type-check

test: ensure-webdist ## 运行后端测试
	cd backend && $(GO) test ./...

vet: ensure-webdist ## 静态分析
	cd backend && $(GO) vet ./...

fmt: ## 格式化后端代码
	cd backend && $(GO) fmt ./...

# ===================== 清理 =====================

clean: ## 清理构建产物
	rm -rf bin/ web/dist
	rm -rf $(WEBDIST)
	mkdir -p $(WEBDIST)
	touch $(WEBDIST)/.gitkeep
