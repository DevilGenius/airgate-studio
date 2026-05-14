package studio

import (
	"context"
	"log/slog"
	"net/http"

	sdk "github.com/DouDOU-start/airgate-sdk/sdkgo"
)

type StudioPlugin struct {
	logger *slog.Logger
	host   sdk.Host
}

func (p *StudioPlugin) Info() sdk.PluginInfo { return buildPluginInfo() }

func (p *StudioPlugin) Init(ctx sdk.PluginContext) error {
	if ctx != nil {
		p.logger = ctx.Logger()
	}
	if p.logger == nil {
		p.logger = slog.Default()
	}
	if hostAware, ok := ctx.(sdk.HostAware); ok {
		p.host = hostAware.Host()
	}
	p.logger.Info("Studio 插件初始化")
	return nil
}

func (p *StudioPlugin) Start(_ context.Context) error {
	p.logger.Info("Studio 插件启动")
	return nil
}

func (p *StudioPlugin) Stop(_ context.Context) error {
	p.logger.Info("Studio 插件停止")
	return nil
}

func (p *StudioPlugin) HandleRequest(_ context.Context, method, path string, _ http.Header, body []byte) (int, http.Header, []byte, error) {
	return routeRequest(p, method, path, body)
}
